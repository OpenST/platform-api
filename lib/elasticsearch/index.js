'use strict';
/**
 * Entry point for AWS Lambda Service
 *
 * @module elasticsearch/lambda
 */

const rootPrefix = '.',
  logger = require(rootPrefix + '/providers/logger'),
  esServices = require(rootPrefix + '/lib/es_services/manifest'),
  TransactionsService = require(rootPrefix + '/services/transactions/service'),
  responseHelper = require(rootPrefix + '/providers/responseHelper'),
  Constants = require(rootPrefix + '/config/constants'),
  config = require(rootPrefix + '/config/es'),
  BulkService = esServices.BulkService;

const pendingTransactionTablePostFix = '_pending_transactions';

class Executor {
  /**
   * @param {Object} records
   *
   * @constructor
   **/
  constructor(records) {
    const oThis = this;
    oThis.records = records;
    oThis.bulkService = new BulkService(config);
  }

  /**
   * populateBulkService
   *
   * @param {Object} record
   *
   * @return promise
   **/
  populateBulkService(record) {
    const oThis = this;

    let service = oThis.getService(record.eventSourceARN);
    if (!service) {
      logger.error('Unable to identify service for record:\n', record);
      return;
    }

    let data = record.dynamodb.NewImage,
      eventName = record.eventName;

    logger.info('Stream record', record);
    /**
     * Make sure no delete operations are performed in ES via Lambda
     **/
    if (Constants.DYNAMO_DELETE_EVENT_NAME == String(eventName).toUpperCase()) {
      return Promise.resolve(data);
    }

    /**
     * Make sure to skip 'sie' = 1 marked records
     **/
    if (!oThis.sendToElasticSearch(data)) {
      logger.log('Record identified to be skipped from elasticsearch:\n', data);
      return;
    }

    data = data || {};
    let keys = record.dynamodb.Keys;
    data = Object.assign({}, keys, data);

    return service.populateBulkService(eventName, data, oThis.bulkService);
  }

  /**
   * getService
   *
   * @param {string} eventSourceARN
   *
   * @return service instance
   **/

  getService(eventSourceARN) {
    const oThis = this;

    if (oThis.isTransactionTable(eventSourceARN)) {
      if (!oThis.transactionsService) {
        oThis.transactionsService = new TransactionsService(config);
      }
      return oThis.transactionsService;
    }

    return null;
  }

  /**
   * isTransactionTable
   *
   * @param {string} eventSourceARN
   *
   * @return boolean
   **/

  isTransactionTable(eventSourceARN) {
    const chainId = config['chainId'],
      ddbTablePrefix = config['ddbTablePrefix'];
    //TO DO replace via regex
    if (
      eventSourceARN.indexOf(chainId) > -1 &&
      eventSourceARN.indexOf(ddbTablePrefix) > -1 &&
      eventSourceARN.indexOf(pendingTransactionTablePostFix) > -1
    ) {
      return true;
    }

    return false;
  }

  /**
   * To check if this record needs to be inserted to Elasticsearch
   *
   * @param data
   * @returns {boolean}
   */
  sendToElasticSearch(data) {
    if (!data.hasOwnProperty(Constants.DYNAMO_TO_ES_IDENTIFIER)) return false;

    let key = Object.keys(data[Constants.DYNAMO_TO_ES_IDENTIFIER])[0];
    let sie = Number(data[Constants.DYNAMO_TO_ES_IDENTIFIER][key]);

    if (sie === 1) return true;

    return false;
  }

  /**
   * perform
   *
   * @return promise
   **/
  async perform() {
    const oThis = this;

    let records = oThis.records,
      len = records.length,
      cnt,
      record;

    for (cnt = 0; cnt < len; cnt++) {
      await oThis.populateBulkService(records[cnt]);
    }
    return oThis.bulkService.perform();
  }
}

exports.handler = async (event, context, callback) => {
  let executor = new Executor(event.Records);
  let response = await executor.perform();
  if (response.isFailure()) {
    callback(JSON.stringify(response.toHash()));
  } else {
    callback(null, JSON.stringify(response.toHash()));
  }
};
