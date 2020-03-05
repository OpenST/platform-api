#!/usr/bin/env node

/**
 * Module dependencies.
 */
const http = require('http');

const rootPrefix = '..',
  app = require(rootPrefix + '/app'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs');

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // Named pipe.
    return val;
  }

  if (port >= 0) {
    // Port number.
    return port;
  }

  return false;
}

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(process.env.PORT || '7001');
app.set('port', port);

/**
 * Create HTTP server.
 */
const server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // Handle specific listen errors with friendly messages.
  switch (error.code) {
    case 'EACCES': {
      const errorObject = responseHelper.error({
        internal_error_identifier: 'elevated_privilege_required:a_7',
        api_error_identifier: 'elevated_privilege_required',
        debug_options: { port: bind }
      });
      createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);
      logger.error('a_7', bind + ' requires elevated privileges');
      process.exit(1);
      break;
    }
    case 'EADDRINUSE': {
      const errorObject = responseHelper.error({
        internal_error_identifier: 'port_in_use:a_8',
        api_error_identifier: 'port_in_use',
        debug_options: { port: bind }
      });
      createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);
      logger.error('a_8', bind + ' is already in use');
      process.exit(1);
      break;
    }
    default:
      throw error;
  }
}

// eslint-disable-next-line no-empty-function
process.send = process.send || function() {};

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  logger.log('Listening on ' + bind);
  process.send('ready');
}

function onTerminationSignal() {
  logger.info('SIGINT signal received.');
  logger.log('Closing http server.');
  server.close(() => {
    logger.log('Current concurrent connections:', server.connections);
    logger.log('Http server closing. Bye.');
    process.exit(0);
  });

  setTimeout(function() {
    logger.log('Timeout occurred for server.close(). Current concurrent connections:', server.connections);
    process.exit(1);
  }, 60000);
}

process.on('SIGTERM', function() {
  onTerminationSignal();
});

process.on('SIGINT', function() {
  onTerminationSignal();
});
