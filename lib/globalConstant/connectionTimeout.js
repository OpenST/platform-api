/**
 * Module for connection timeout constants.
 *
 * @module /lib/globalConstant/connectionTimeout
 */

/**
 * Class for connection timeout constants.
 *
 * @class ConnectionWaitTimeout
 */
class ConnectionWaitTimeout {
  // Connection wait timeout for app server.
  get appServer() {
    return 30;
  }

  // Connection wait timeout for crons.
  get crons() {
    return 3600;
  }

  // Connection switch timeout for app server.
  get switchConnectionAppServer() {
    return 5;
  }

  // Connection switch timeout for crons.
  get switchConnectionCrons() {
    return 5;
  }
}

module.exports = new ConnectionWaitTimeout();
