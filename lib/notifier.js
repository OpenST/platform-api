/**
 * Email notifier class.
 *
 * @module lib/notifier
 */
const getNamespace = require('continuation-local-storage').getNamespace,
  requestNamespace = getNamespace('ost-platform-nameSpace');

const rootPrefix = '..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  rabbitmqProvider = require(rootPrefix + '/lib/providers/rabbitmq'),
  rabbitmqConstant = require(rootPrefix + '/lib/globalConstant/rabbitmq'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout');

/**
 * Class for email notifier.
 *
 * @class NotifierKlass
 */
class NotifierKlass {
  perform(code, msg, errData, debugData) {
    const oThis = this;

    return oThis.asyncPerform(code, msg, errData, debugData).catch((error) => {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error(`${__filename}::perform::catch`);
      logger.error(error);

      return responseHelper.error({
        internal_error_identifier: 'l_n_1',
        api_error_identifier: 'unhandled_catch_response',
        debug_options: {}
      });
    });
  }

  /**
   * Notify error through email.
   *
   * @param {String} code
   * @param {String} msg
   * @param {String/Object} errData
   * @param {String/Object} debugData
   *
   * @return {Promise<void>}
   */
  async asyncPerform(code, msg, errData, debugData) {
    const ostNotification = await rabbitmqProvider.getInstance(rabbitmqConstant.globalRabbitmqKind, {
      connectionWaitSeconds: connectionTimeoutConst.appServer,
      switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionAppServer
    });
    // Convert the custom error object to formatted object.
    if (responseHelper.isCustomResult(errData)) {
      const formattedError = errData.toHash();
      formattedError.debug_options = errData.debug_options;

      errData = formattedError;
    }

    logger.error('error_code:', code, 'error_msg:', msg, 'error:', errData, 'debug_data', debugData);

    if (!ostNotification) {
      logger.warn('Failed to send email. ostNotification is null');

      return;
    }

    let bodyData = null;

    try {
      bodyData = JSON.stringify(errData);
    } catch (err) {
      bodyData = errData;
    }

    let stringifiedDebugData = null;

    try {
      stringifiedDebugData = JSON.stringify(debugData);
    } catch (err) {
      stringifiedDebugData = debugData;
    }

    let requestId = '';
    const packageName = coreConstants.NOTIFIER_POSTFIX;

    if (requestNamespace && requestNamespace.get('reqId')) {
      requestId = requestNamespace.get('reqId');
    }
    const payload = {
      subject:
        `[${coreConstants.SA_ENV_IDENTIFIER}] ` +
        packageName +
        ' :: ' +
        coreConstants.environment +
        ' - ' +
        coreConstants.subEnvironment +
        '::' +
        code,
      body:
        ' Request id: ' +
        requestId +
        '\n\n Debug data: ' +
        stringifiedDebugData +
        '\n\n Error message: ' +
        msg +
        ' \n\n Error: ' +
        bodyData
    };

    ostNotification.publishEvent
      .perform({
        topics: ['email_error.' + packageName],
        publisher: 'OST',
        message: {
          kind: 'email',
          payload: payload
        }
      })
      .catch((err) => {
        logger.error('Message for airdrop router was not published. Payload: ', payload, ' Error: ', err);
      });
    logger.info('......Lo bhai... ho gaya.......');
  }
}

module.exports = new NotifierKlass();
