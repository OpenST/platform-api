'use strict';
/**
 * RabbitMQ instance provider which is not client specific.
 *
 * @module lib/providers/sharedNotification
 */
const OpenStNotification = require('@openstfoundation/openst-notification');

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  SharedRabbitmqHelper = require(rootPrefix + '/helpers/configStrategy/SharedRabbitmqHelper');

/**
 * Class for shared rabbitmq provider
 *
 * @class
 */
class SharedRabbitMqProviderKlass {
  /**
   * Constructor for shared rabbitmq provider
   *
   * @constructor
   */
  constructor() {
    const oThis = this;
    oThis.sharedRabbitmqData = null;
  }

  /**
   * Get shared Rabbitmq data.
   *
   * @returns {Promise<*>}
   */
  async getSharedRmqData() {
    const oThis = this;

    if (!oThis.sharedRabbitmqData) {
      let sharedRmqHelperObj = new SharedRabbitmqHelper(),
        sharedRmqResponse = await sharedRmqHelperObj.get();

      if (sharedRmqResponse) {
        oThis.sharedRabbitmqData = sharedRmqResponse;
      } else {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'li_pr_sn_1',
            api_error_identifier: 'something_went_wrong',
            debug_options: {}
          })
        );
      }
    }
    return Promise.resolve(oThis.sharedRabbitmqData);
  }

  /**
   * Get shared rabbitmq provider
   *
   * @return {Object}
   */
  async getInstance(params) {
    const oThis = this;

    let sharedRmqDataHash = await oThis.getSharedRmqData();

    const notificationConfigStrategy = {
      OST_RMQ_USERNAME: sharedRmqDataHash.username,
      OST_RMQ_PASSWORD: sharedRmqDataHash.password,
      OST_RMQ_HOST: sharedRmqDataHash.host,
      OST_RMQ_PORT: sharedRmqDataHash.port,
      OST_RMQ_CLUSTER_NODES: sharedRmqDataHash.heartbeats,
      OST_RMQ_HEARTBEATS: sharedRmqDataHash.clusterNodes,
      OST_RMQ_SUPPORT: coreConstants.OST_RMQ_SUPPORT
    };
    if (params) {
      Object.assign(notificationConfigStrategy, {
        CONNECTION_WAIT_SECONDS: params.connectionWaitSeconds,
        SWITCH_HOST_AFTER_TIME: params.switchConnectionWaitSeconds
      });
    }

    return OpenStNotification.getInstance(notificationConfigStrategy);
  }
}

module.exports = new SharedRabbitMqProviderKlass();
