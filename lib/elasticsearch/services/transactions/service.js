'use strict';

/**
 * transactions elasticsearch service.
 *
 * @module elasticsearch/transactions/service
 */

const rootPrefix = '../..',
  Constants = require(rootPrefix + '/config/constants'),
  logger = require(rootPrefix + '/providers/logger'),
  esServices = require(rootPrefix + '/lib/es_services/manifest'),
  responseHelper = require(rootPrefix + '/providers/responseHelper'),
  dataFormatter = require(rootPrefix + '/services/transactions/dynamo_to_es_formatter'),
  Formatter = require(rootPrefix + '/helpers/Formatter'),
  dynamoHelpers = require(rootPrefix + '/helpers/dynamo_formatters'),
  BulkService = esServices.BulkService,
  CreateService = esServices.CreateService,
  UpdateService = esServices.UpdateService,
  SearchService = esServices.SearchService,
  DeleteService = esServices.DeleteService;

const INDEX_POSTFIX = '_transactions',
  DYNAMO_ID_KEY = 'txu',
  DOC_TYPE = '_doc';

class Service {
  /**
   * @param {Object} config
   *
   * @constructor
   **/
  constructor(config) {
    const oThis = this;

    if (!config) {
      throw 'Config is mandatory for transaction service.';
    }

    if (!config.chainId) {
      logger.error('ChainId in transaction service config is mandatory.', config);
      throw 'ChainId in transaction service config is mandatory.';
    }

    oThis.config = config;
  }

  /**
   * getDocumentIndex
   *
   * @return {string} es_document_index_name
   **/

  getDocumentIndex() {
    const oThis = this;
    return oThis.config.chainId + INDEX_POSTFIX;
  }

  /**
   * getConfig
   *
   * @return {Object} copy of this.config
   **/
  getConfig() {
    const oThis = this;
    return Object.assign({}, oThis.config);
  }

  /**
   * bulk
   * @params : eventName{string}  , arData{Array<Object>} ,  params {Object} optional
   * @return {Promise} promise
   **/

  async bulk(eventName, arData, params) {
    const oThis = this,
      config = oThis.getConfig();

    if (!arData instanceof Array) {
      arData = [arData];
    }

    let len = arData.length,
      bulkService = new BulkService(config, params),
      cnt,
      data;

    for (cnt = 0; cnt < len; cnt++) {
      data = arData[cnt];
      await oThis.populateBulkService(eventName, data, bulkService);
    }

    return bulkService.perform();
  }

  /**
   * create
   * Use only when your are sure to create an new record.
   * If not use update , it will update if exist or will create a new one
   * @params : data{Array<Object>} , params {Object} optional
   **/

  create(data, params) {
    const oThis = this,
      config = oThis.getConfig();
    let service = new CreateService(config, params);

    return oThis
      .formatDynamoData(data)
      .then(function(formattedData) {
        logger.debug('\nformattedData:\n', formattedData);
        let dataId = formattedData.id,
          actionDesc = {
            index: oThis.getDocumentIndex(),
            id: dataId,
            type: DOC_TYPE
          };
        service.setActionDescription(actionDesc);
        service.setRequestBody(formattedData);
        return service.perform();
      })
      .catch(function(reason) {
        // Format Error.
        logger.error('Failed to format transactions record.\n Reason:', reason, '\n data:', data);

        return responseHelper.error({
          internal_error_identifier: 'l_es_s_tl_s_c',
          api_error_identifier: 'invalid_params'
        });
      });
  }

  /**
   * update
   *  Will update if exist or will create a new one
   * @params : data{Array<Object>} , params {Object} optional
   **/

  update(data, params) {
    const oThis = this,
      config = oThis.getConfig();
    let service = new UpdateService(config, params);

    return oThis
      .formatDynamoData(data)
      .then(function(formattedData) {
        logger.debug('\nformattedData:\n', formattedData);
        let dataId = formattedData.id,
          actionDesc = {
            index: oThis.getDocumentIndex(),
            id: dataId,
            type: DOC_TYPE
          };
        service.setActionDescription(actionDesc);
        service.setRequestBody(formattedData);
        return service.perform();
      })
      .catch(function(reason) {
        // Format Error.
        logger.error('Failed to format transactions record.\n Reason:', reason, '\n data:', data);

        return responseHelper.error({
          internal_error_identifier: 'l_es_s_tl_s_u',
          api_error_identifier: 'invalid_params'
        });
      });
  }

  /**
   * search
   *
   * queryBody - query for ES
   * Eg queryBody : {
   *			"query": {
   *		  		"match": {
   *					"updated_at": ua
   *		 			 }
   *				},
   *			"from": 0,
   *			"size": 10
   *	 		}
   * requestSource - Fields to get from ES , default will get complete document.
   * Eg requestSource : ["id", "from_uuid", ...]
   * , params {Object} optional
   *
   * @return promise {Promise}
   * */
  search(queryBody, requestSource, params) {
    const oThis = this,
      config = oThis.getConfig();
    let service = new SearchService(config, params);
    let actionDesc = {
      index: oThis.getDocumentIndex()
    };
    service.setActionDescription(actionDesc);
    if (queryBody) {
      service.setRequestBody(queryBody);
    }
    if (requestSource) {
      service.setRequestSource(requestSource);
    }
    return service.perform();
  }

  /**
   * delete
   * @params : dataId {String} , params {Object} optional
   * @return promise {Promise}
   **/

  delete(dataId, params) {
    const oThis = this,
      config = oThis.getConfig();
    let service = new DeleteService(config, params);
    let actionDesc = {
      index: oThis.getDocumentIndex(),
      id: dataId,
      type: DOC_TYPE
    };
    service.setActionDescription(actionDesc);
    return service.perform();
  }

  /**
   * populateBulkService
   * @params : eventName{String} , data {Object} , bulkService {Service}
   * @return promise {Promise}
   **/

  populateBulkService(eventName, data, bulkService) {
    const oThis = this,
      config = oThis.getConfig();

    let populatePromise;

    if (Constants.DYNAMO_DELETE_EVENT_NAME === String(eventName).toUpperCase()) {
      populatePromise = new Promise(function(resolve, reject) {
        if (!data[oThis.DYNAMO_ID_KEY]) {
          reject('Could not determine the id of record to delete.');
        }

        let dataId = dynamoHelpers.val(data[oThis.DYNAMO_ID_KEY]);
        if (Formatter.isNull(dataId)) {
          reject(new Error('Could not determine the id of record to delete.'));
        }
        resolve({
          id: dataId
        });
      });
    } else {
      populatePromise = oThis.formatDynamoData(data);
    }

    return populatePromise
      .then(function(formattedData) {
        // Data successfully formatted.
        logger.log('\nformattedData:\n', formattedData);

        let dataId = formattedData.id,
          actionDescKey,
          actionDescPayload = {
            _index: oThis.getDocumentIndex(),
            _id: dataId,
            _type: DOC_TYPE
          },
          actionDesc,
          actionBody;

        switch (String(eventName).toUpperCase()) {
          case Constants.DYNAMO_DELETE_EVENT_NAME:
            actionDescKey = 'delete';
            actionBody = null;
            break;
          case Constants.DYNAMO_INSERT_EVENT_NAME:
          case Constants.DYNAMO_UPDATE_EVENT_NAME:
            actionDescKey = 'index';
            actionBody = formattedData;
            break;
          default:
            throw "Unrecognised dynamo event name: '" + eventName + "'";
        }

        actionDesc = {};
        actionDesc[actionDescKey] = actionDescPayload;
        bulkService.addRequestParams(actionDesc);
        if (actionBody) {
          bulkService.addRequestParams(actionBody);
        }
      })
      .catch(function(reason) {
        // Format Error.
        logger.error(
          'Failed to format transactions record.\n Reason:',
          reason,
          '\n eventName:',
          eventName,
          '\n data:',
          data
        );
      });
  }

  /**
   * formatDynamoData
   * @params :  data {Object}
   * @return new promise {Promise}
   **/
  formatDynamoData(data) {
    return new Promise(function(resolve, reject) {
      let formattedData = dataFormatter.format(data);
      resolve(formattedData);
    });
  }
}

module.exports = Service;
