'use strict';
/**
 * Manifest of elasticsearch core services.
 *
 * @module elasticsearch/lib/es_services/bulk
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/providers/logger'),
  esClient = require(rootPrefix + '/providers/es'),
  responseHelper = require(rootPrefix + '/providers/responseHelper');

class Service {
  constructor(config, params) {
    if (!config) {
      throw 'Config is mandatory for ES bulk service.';
    }

    const oThis = this,
      esConfig = config.elasticSearch;

    oThis.params = params || {};

    oThis.requestBody = [];
    if (oThis.params.hasOwnProperty('body')) {
      oThis.requestBody = oThis.params['body'] || oThis.requestBody;
    }

    oThis.client = esClient.getESClient(esConfig);
  }

  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_es_s_es_b_p',
          api_error_identifier: 'unhandled_catch_response'
        });
      }
    });
  }

  asyncPerform() {
    const oThis = this;
    if (!oThis.requestBody.length) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_es_s_es_b_ap_no_op',
          api_error_identifier: 'no_operation_specified',
          debug_options: {
            requestBody: oThis.requestBody
          }
        })
      );
    }

    return oThis.client
      .bulk(oThis.buildParams())
      .then(function(clientResponse) {
        logger.win(`Bulk Operation Successful and took ${clientResponse.took} ms`);
        clientResponse['result_type'] = 'items';
        return responseHelper.successWithData(clientResponse);
      })
      .catch(function(clientError) {
        logger.error('Bulk Operation Failed!');
        return responseHelper.error({
          internal_error_identifier: 'l_es_s_es_b_ap_c',
          api_error_identifier: 'invalid_elasticsearch_params',
          debug_options: {
            error_details: clientError
          }
        });
      });
  }

  buildParams() {
    const oThis = this,
      finalParams = Object.assign({}, oThis.params);

    finalParams['body'] = oThis.requestBody;

    logger.debug('bulkParams:\n', finalParams);
    return finalParams;
  }

  addRequestParams(params) {
    const oThis = this;
    oThis.requestBody.push(params);
  }
}

module.exports = Service;
