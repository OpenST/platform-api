'use strict';

const rootPrefix = '.';

const express = require('express'),
  path = require('path'),
  createNamespace = require('continuation-local-storage').createNamespace,
  morgan = require('morgan'),
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser'),
  helmet = require('helmet'),
  customUrlParser = require('url'),
  cluster = require('cluster'),
  http = require('http');

const jwtAuth = require(rootPrefix + '/lib/jwt/jwtAuth'),
  emailNotifier = require(rootPrefix + '/lib/notifier'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  v2Routes = require(rootPrefix + '/routes/v2/index'),
  internalRoutes = require(rootPrefix + '/routes/internal/index'),
  elbHealthCheckerRoute = require(rootPrefix + '/routes/internal/elb_health_checker'),
  ValidateApiSignature = require(rootPrefix + '/lib/validateApiSignature/Factory'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  customMiddleware = require(rootPrefix + '/helpers/customMiddleware'),
  SystemServiceStatusesCacheKlass = require(rootPrefix + '/lib/cacheManagement/shared/SystemServiceStatus'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  environmentInfo = require(rootPrefix + '/lib/globalConstant/environmentInfo'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  errorConfig = basicHelper.fetchErrorConfig(apiVersions.internal),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName'),
  sanitizer = require(rootPrefix + '/helpers/sanitizer');

const requestSharedNameSpace = createNamespace('saasApiNameSpace'),
  systemServiceStatusesCache = new SystemServiceStatusesCacheKlass({});

morgan.token('id', function getId(req) {
  return req.id;
});

morgan.token('endTime', function getendTime(req) {
  var hrTime = process.hrtime();
  return hrTime[0] * 1000 + hrTime[1] / 1000000;
});
morgan.token('endDateTime', function getEndDateTime(req) {
  return basicHelper.logDateFormat();
});

const startRequestLogLine = function(req, res, next) {
  let message =
    "Started '" +
    customUrlParser.parse(req.originalUrl).pathname +
    "'  '" +
    req.method +
    "' at " +
    basicHelper.logDateFormat();
  logger.info(message);

  next();
};

const assignParams = function(req, res, next) {
  // IMPORTANT NOTE: Don't assign parameters before sanitization
  // Also override any request params, related to signatures
  // And finally assign it to req.decodedParams
  req.decodedParams = Object.assign(getRequestParams(req), req.decodedParams);

  next();
};

const getRequestParams = function(req) {
  // IMPORTANT NOTE: Don't assign parameters before sanitization
  if (req.method == 'POST') {
    return req.body;
  } else if (req.method == 'GET') {
    return req.query;
  }
};
const validateApiSignature = function(req, res, next) {
  let inputParams = getRequestParams(req);

  const handleParamValidationResult = function(result) {
    if (result.isSuccess()) {
      if (!req.decodedParams) {
        req.decodedParams = {};
      }
      // NOTE: MAKE SURE ALL SANITIZED VALUES ARE ASSIGNED HERE
      req.decodedParams['client_id'] = result.data['clientId'];
      req.decodedParams['token_id'] = result.data['tokenId'];
      req.decodedParams['user_data'] = result.data['userData'];
      req.decodedParams['app_validated_api_name'] = result.data['appValidatedApiName'];
      req.decodedParams['api_signature_kind'] = result.data['apiSignatureKind'];
      req.decodedParams['token_shard_details'] = result.data['tokenShardDetails'];
      next();
    } else {
      return result.renderResponse(res, errorConfig);
    }
  };

  return new ValidateApiSignature({
    inputParams: inputParams,
    requestPath: customUrlParser.parse(req.originalUrl).pathname,
    requestMethod: req.method
  })
    .perform()
    .then(handleParamValidationResult);
};

// before action for verifying the jwt token and setting the decoded info in req obj
const decodeJwt = function(req, res, next) {
  if (req.method == 'POST') {
    var token = req.body.token || '';
  } else if (req.method == 'GET') {
    var token = req.query.token || '';
  }

  // Set the decoded params in the re and call the next in control flow.
  const jwtOnResolve = function(reqParams) {
    req.decodedParams = sanitizer.sanitizeParams(reqParams.data);
    req.decodedParams['app_validated_api_name'] = apiName.allInternalRoutes;
    // Validation passed.
    return next();
  };

  // send error, if token is invalid
  const jwtOnReject = function(err) {
    return responseHelper
      .error({
        internal_error_identifier: 'a_1',
        api_error_identifier: 'invalid_or_expired_jwt_token',
        debug_options: {}
      })
      .renderResponse(res, errorConfig);
  };

  // Verify token
  Promise.resolve(jwtAuth.verifyToken(token, 'saasApi').then(jwtOnResolve, jwtOnReject)).catch(function(err) {
    emailNotifier.perform('a_2', 'JWT Decide Failed', { token: token }, {});
    logger.error('a_2', 'JWT Decide Failed', { token: token });

    return responseHelper
      .error({
        internal_error_identifier: 'a_2',
        api_error_identifier: 'something_went_wrong',
        debug_options: {}
      })
      .renderResponse(res, errorConfig);
  });
};

// Set request debugging/logging details to shared namespace
const appendRequestDebugInfo = function(req, res, next) {
  requestSharedNameSpace.run(function() {
    requestSharedNameSpace.set('reqId', req.id);
    requestSharedNameSpace.set('startTime', req.startTime);
    next();
  });
};

// check system service statuses and return error if they are down
const checkSystemServiceStatuses = async function(req, res, next) {
  const statusRsp = await systemServiceStatusesCache.fetch();
  if (statusRsp.isSuccess && statusRsp.data && statusRsp.data['saas_api_available'] != 1) {
    return responseHelper
      .error({
        internal_error_identifier: 'a_4',
        api_error_identifier: 'api_under_maintenance',
        debug_options: {}
      })
      .renderResponse(res, errorConfig);
  }

  next();
};

const handleDepricatedRoutes = function(req, res, next) {
  return responseHelper
    .error({
      internal_error_identifier: 'a_8',
      api_error_identifier: 'unsupported_routes',
      debug_options: {}
    })
    .renderResponse(res, errorConfig);
};

const appendInternalVersion = function(req, res, next) {
  req.decodedParams.apiVersion = apiVersions.internal;
  next();
};

const appendV2Version = function(req, res, next) {
  req.decodedParams.apiVersion = apiVersions.v2;
  next();
};

const killMasterIfAllWorkersDied = function() {
  if (onlineWorker == 0) {
    logger.log('Killing master as all workers are dead.');
    process.exit(1);
  }
};

// if the process is a master.
if (cluster.isMaster) {
  // Set worker process title
  process.title = 'Company Restful API node master';

  // Fork workers equal to number of CPUs
  const numWorkers = process.env.OST_CACHING_ENGINE == 'none' ? 1 : process.env.WORKERS || require('os').cpus().length;

  for (var i = 0; i < numWorkers; i++) {
    // Spawn a new worker process.
    cluster.fork();
  }

  // Worker started listening and is ready
  cluster.on('listening', function(worker, address) {
    logger.info(`[worker-${worker.id} ] is listening to ${address.port}`);
  });
  var onlineWorker = 0;
  // Worker came online. Will start listening shortly
  cluster.on('online', function(worker) {
    logger.info(`[worker-${worker.id}] is online`);
    // when a worker comes online, increment the online worker count
    onlineWorker = onlineWorker + 1;
  });

  //  Called when all workers are disconnected and handles are closed.
  cluster.on('disconnect', function(worker) {
    emailNotifier.perform('a_3', `[worker-${worker.id}] is disconnected`, {}, {});
    logger.error('a_3', `[worker-${worker.id}] is disconnected`);
    // when a worker disconnects, decrement the online worker count
    onlineWorker = onlineWorker - 1;
  });

  // When any of the workers die the cluster module will emit the 'exit' event.
  cluster.on('exit', function(worker, code, signal) {
    if (worker.exitedAfterDisconnect === true) {
      // don't restart worker as voluntary exit
      logger.info(`[worker-${worker.id}] voluntary exit. signal: ${signal}. code: ${code}`);
    } else {
      // restart worker as died unexpectedly
      emailNotifier.perform(code, `[worker-${worker.id}] restarting died. signal: ${signal}. code: ${code}`, {}, {});
      logger.error(code, `[worker-${worker.id}] restarting died. signal: ${signal}. code: ${code}`);
      cluster.fork();
    }
  });
  // Exception caught
  process.on('uncaughtException', function(err) {
    emailNotifier.perform('app_crash_1', 'App server exited unexpectedly.', err, {});
    logger.error('app_crash_1', 'App server exited unexpectedly. Reason: ', err);
    process.exit(1);
  });
  // When someone try to kill the master process
  // kill <master process id>
  process.on('SIGTERM', function() {
    for (var id in cluster.workers) {
      cluster.workers[id].exitedAfterDisconnect = true;
    }
    setInterval(killMasterIfAllWorkersDied, 10);
    cluster.disconnect(function() {
      logger.info('Master received SIGTERM. Killing/disconnecting it.');
    });
  });
} else if (cluster.isWorker) {
  // if the process is not a master

  // Set worker process title
  process.title = 'Company Restful API node worker-' + cluster.worker.id;

  // Create express application instance
  const app = express();

  // Load custom middleware and set the worker id
  app.use(customMiddleware({ worker_id: cluster.worker.id }));
  // Load Morgan
  app.use(
    morgan(
      '[:id][:endTime] Completed with ":status" in :response-time ms at :endDateTime -  ":res[content-length] bytes" - ":remote-addr" ":remote-user" - "HTTP/:http-version :method :url" - ":referrer" - ":user-agent"'
    )
  );

  app.use(helmet());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

  // Mark older routes as UNSUPPORTED_VERSION
  app.use('/transaction-types', handleDepricatedRoutes);
  app.use('/users', handleDepricatedRoutes);
  app.use('/v1', handleDepricatedRoutes);
  app.use('/v1.1', handleDepricatedRoutes);

  // Following are the routes
  app.use('/health-checker', elbHealthCheckerRoute);

  /*
    The sanitizer piece of code should always be before routes for jwt and after validateApiSignature for sdk.
    Docs: https://www.npmjs.com/package/sanitize-html
  */

  app.use(
    '/' + environmentInfo.urlPrefix + '/internal',
    startRequestLogLine,
    checkSystemServiceStatuses,
    appendRequestDebugInfo,
    sanitizer.sanitizeBodyAndQuery,
    decodeJwt,
    appendInternalVersion,
    internalRoutes
  );

  app.use(
    '/' + environmentInfo.urlPrefix + '/v2',
    startRequestLogLine,
    checkSystemServiceStatuses,
    appendRequestDebugInfo,
    validateApiSignature,
    sanitizer.sanitizeBodyAndQuery,
    assignParams,
    appendV2Version,
    v2Routes
  );

  // catch 404 and forward to error handler
  app.use(function(req, res, next) {
    let message =
      "Started '" +
      customUrlParser.parse(req.originalUrl).pathname +
      "'  '" +
      req.method +
      "' at " +
      basicHelper.logDateFormat();
    logger.info(message);

    return responseHelper
      .error({
        internal_error_identifier: 'a_5',
        api_error_identifier: 'resource_not_found',
        debug_options: {}
      })
      .renderResponse(res, errorConfig);
  });

  // error handler
  app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    emailNotifier.perform('a_6', 'Something went wrong.', err, {});
    logger.error('a_6', 'Something went wrong', err);
    return responseHelper
      .error({
        internal_error_identifier: 'a_7',
        api_error_identifier: 'something_went_wrong',
        debug_options: {}
      })
      .renderResponse(res, errorConfig);
  });

  /**
   * Get port from environment and store in Express.
   */

  var port = normalizePort(process.env.PORT || '7001');
  app.set('port', port);

  /**
   * Create HTTP server.
   */

  var server = http.createServer(app);

  /**
   * Listen on provided port, on all network interfaces.
   */

  server.listen(port, 443);
  server.on('error', onError);
  server.on('listening', onListening);
}

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  let bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      emailNotifier.perform('a_8', `${bind} requires elevated privileges`, {}, {});
      logger.error('a_8', bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      emailNotifier.perform('a_9', `${bind} is already in use`, {}, {});
      logger.error('a_9', bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  let addr = server.address();
  var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
}
