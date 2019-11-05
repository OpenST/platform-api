'use strict';

const rootPrefix = '.';

const express = require('express'),
  path = require('path'),
  createNamespace = require('continuation-local-storage').createNamespace,
  morgan = require('morgan'),
  bodyParser = require('body-parser'),
  helmet = require('helmet'),
  customUrlParser = require('url');

const jwtAuth = require(rootPrefix + '/lib/jwt/jwtAuth'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
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
  AuthenticateApiByWebhookKeySecret = require(rootPrefix + '/lib/validateApiSignature/ByWebhookKeySecret'),
  sanitizer = require(rootPrefix + '/helpers/sanitizer');

const requestSharedNameSpace = createNamespace('saasApiNameSpace'),
  systemServiceStatusesCache = new SystemServiceStatusesCacheKlass({});

morgan.token('id', function getId(req) {
  return req.id;
});

morgan.token('endTime', function getendTime(req) {
  let hrTime = process.hrtime();
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

/**
 * Assign params
 *
 * @param req
 * @param res
 * @param next
 */
const assignParams = function(req, res, next) {
  // IMPORTANT NOTE: Don't assign parameters before sanitization
  // Also override any request params, related to signatures
  // And finally assign it to req.decodedParams
  req.decodedParams = Object.assign(getRequestParams(req), req.decodedParams);

  next();
};

/**
 * Get request params
 *
 * @param req
 * @return {*}
 */
const getRequestParams = function(req) {
  // IMPORTANT NOTE: Don't assign parameters before sanitization
  if (req.method === 'POST') {
    return req.body;
  } else if (req.method === 'GET' || req.method === 'DELETE') {
    return req.query;
  } else {
    return {};
  }
};

/**
 * Validate API signature
 *
 * @param req
 * @param res
 * @param next
 * @return {Promise|*|{$ref}|PromiseLike<T>|Promise<T>}
 */
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

  // Following line always gives resolution. In case this assumption changes, please add catch here.
  return new ValidateApiSignature({
    inputParams: inputParams,
    requestPath: customUrlParser.parse(req.originalUrl).pathname,
    requestMethod: req.method
  })
    .perform()
    .then(handleParamValidationResult);
};

const validateWebhookSignature = function(req, res, next) {
  console.log('I am in app.js validateWebhookSignature');
  let inputParams = getRequestParams(req);
  //Object.assign(inputParams, req.headers);
  console.log('---------inputParams---', inputParams);
  console.log('---------req.headers---', req.headers);
  // Following line always gives resolution. In case this assumption changes, please add catch here.
  return new AuthenticateApiByWebhookKeySecret({
    inputParams: inputParams,
    requestHeaders: req.headers
  })
    .perform()
    .then(function(resp) {
      if (resp.isSuccess()) {
        console.log('----------validateWebhookSignature-------resp--------------', resp);
        next();
      } else {
        return resp.renderResponse(res, errorConfig);
      }
    });
};

// before action for verifying the jwt token and setting the decoded info in req obj
const decodeJwt = function(req, res, next) {
  let token;

  if (req.method === 'POST' || req.method === 'DELETE') {
    token = req.body.token || '';
  } else if (req.method === 'GET') {
    token = req.query.token || '';
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
    const errorObject = responseHelper.error({
      internal_error_identifier: 'jwt_decide_failed:a_2',
      api_error_identifier: 'jwt_decide_failed',
      debug_options: { token: token }
    });
    createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.lowSeverity);
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

// In order to put Saas into maintenance, set systemServiceStatusesCache with saas_api_available = 0
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
  logger.debug('completed checking checkSystemServiceStatuses');
  next();
};

/**
 * Handle deprecated routes
 * @param req
 * @param res
 * @param next
 */
const handleDepricatedRoutes = function(req, res, next) {
  return responseHelper
    .error({
      internal_error_identifier: 'a_8',
      api_error_identifier: 'unsupported_routes',
      debug_options: {}
    })
    .renderResponse(res, errorConfig);
};

/**
 * Append internal version
 *
 * @param req
 * @param res
 * @param next
 */
const appendInternalVersion = function(req, res, next) {
  req.decodedParams.apiVersion = apiVersions.internal;
  next();
};

/**
 * Append V2 version
 *
 * @param req
 * @param res
 * @param next
 */
const appendV2Version = function(req, res, next) {
  req.decodedParams.apiVersion = apiVersions.v2;
  next();
};

// Set worker process title
process.title = 'Company Restful API node worker';

// Create express application instance
const app = express();

// Add id and startTime to request
app.use(customMiddleware());

// Load Morgan
app.use(
  morgan(
    '[:id][:endTime] Completed with ":status" in :response-time ms at :endDateTime -  ":res[content-length] bytes" - ":remote-addr" ":remote-user" - "HTTP/:http-version :method :url" - ":referrer" - ":user-agent"'
  )
);

// Helmet helps secure Express apps by setting various HTTP headers.
app.use(helmet());

// Node.js body parsing middleware.
app.use(bodyParser.json());

// Parsing the URL-encoded data with the qs library (extended: true)
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

// Mark older routes as UNSUPPORTED_VERSION
app.use('/transaction-types', handleDepricatedRoutes);
app.use('/users', handleDepricatedRoutes);
app.use('/v1', handleDepricatedRoutes);
app.use('/v1.1', handleDepricatedRoutes);

// Following are the routes
app.use('/health-checker', elbHealthCheckerRoute);

app.use(
  '/' + environmentInfo.urlPrefix + '/test_webhook',
  startRequestLogLine,
  appendRequestDebugInfo,
  validateWebhookSignature,
  sanitizer.sanitizeBodyAndQuery,
  assignParams,
  internalRoutes
);

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
  const errorObject = responseHelper.error({
    internal_error_identifier: `a_6`,
    api_error_identifier: 'something_went_wrong',
    debug_options: { err: err }
  });
  createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.lowSeverity);
  logger.error('a_6', 'Something went wrong', err);
  return responseHelper
    .error({
      internal_error_identifier: 'a_6',
      api_error_identifier: 'something_went_wrong',
      debug_options: {}
    })
    .renderResponse(res, errorConfig);
});

module.exports = app;
