'use strict';

const getNamespace = require('continuation-local-storage').getNamespace,
  requestNamespace = getNamespace('openST-Platform-NameSpace');

const rootPrefix = '..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  connectionTimeoutConst = require(rootPrefix + '/lib/globalConstant/connectionTimeout'),
  sharedRabbitMqProvider = require(rootPrefix + '/lib/providers/sharedNotification');

class NotifierKlass {
  constructor() {}

  /**
   * Notify error through email
   */
  async notify(code, msg, errData, debugData) {
    console.log('-5--1----------------------------------------');
    const openSTNotification = await sharedRabbitMqProvider.getInstance({
      connectionWaitSeconds: connectionTimeoutConst.appServer,
      switchConnectionWaitSeconds: connectionTimeoutConst.switchConnectionAppServer
    });
    console.log('-5--2----------------------------------------');
    // convert the custom error object to formatted object.
    if (responseHelper.isCustomResult(errData)) {
      let formattedError = errData.toHash();
      formattedError.debug_options = errData.debug_options;

      errData = formattedError;
    }

    logger.error('error_code:', code, 'error_msg:', msg, 'error:', errData, 'debug_data', debugData);

    if (!openSTNotification) {
      logger.warn('Failed to send email. openSTNotification is null');
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

    let requestId = '',
      packageName = coreConstants.NOTIFIER_POSTFIX;

    if (requestNamespace && requestNamespace.get('reqId')) {
      requestId = requestNamespace.get('reqId');
    }
    const payload = {
      subject:
        `[${coreConstants.ENV_IDENTIFIER}] ` +
        packageName +
        ' :: ' +
        coreConstants.ENVIRONMENT +
        ' - ' +
        coreConstants.SUB_ENVIRONMENT +
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

    openSTNotification.publishEvent
      .perform({
        topics: ['email_error.' + packageName],
        publisher: 'OST',
        message: {
          kind: 'email',
          payload: payload
        }
      })
      .catch(function(err) {
        logger.error('Message for airdrop router was not published. Payload: ', payload, ' Error: ', err);
      });
    logger.info('......Lo bhai... ho gaya.......');
  }
}

module.exports = new NotifierKlass();
