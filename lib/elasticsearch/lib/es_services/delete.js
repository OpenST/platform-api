'use strict';
/**
 * Manifest of elasticsearch core services.
 *
 * @module elasticsearch/services/es_services/delete
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/providers/logger'),
  ESClient = require(rootPrefix + '/providers/es'),
  responseHelper = require(rootPrefix + '/providers/responseHelper');

class Service {
  constructor(config, params) {
    if (!config) {
      throw 'Config is mandatory for ES delete service.';
    }
    const oThis = this,
      esConfig = config.es;
    oThis.params = params || {};
    oThis.requestBody = {};
    oThis.client = ESClient(esConfig);
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
          internal_error_identifier: 'l_es_s_es_d_p',
          api_error_identifier: 'unhandled_catch_response'
        });
      }
    });
  }

  asyncPerform() {
    const oThis = this;

    let params;
    try {
      params = oThis.buildParams();
      return oThis.client
        .index(oThis.buildParams())
        .then(function(clientResponse) {
          logger.win(`delete Operation Successful and took ${clientResponse.took} ms`);
          logger.debug('params', params);
          logger.debug('delete Operation clientResponse:', clientResponse);
          return responseHelper.successWithData(clientResponse);
        })
        .catch(function(clientError) {
          logger.error('Delete Operation Failed!');
          logger.debug('params', params);
          return responseHelper.error({
            internal_error_identifier: 'l_es_s_es_d_ap_c',
            api_error_identifier: 'invalid_elasticsearch_params',
            debug_options: {
              error_details: clientError
            }
          });
        });
    } catch (e) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_es_s_es_d_ap_in_p',
          api_error_identifier: ''
        })
      );
    }
  }

  buildParams() {
    const oThis = this,
      finalParams = Object.assign({}, oThis.params, oThis.actionDescription);

    finalParams['body'] = oThis.requestBody;
    return finalParams;
  }

  setActionDescription(actionDescription) {
    const oThis = this;
    oThis.actionDescription = actionDescription;
  }
}

module.exports = Service;
