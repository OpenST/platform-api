'use strict';
/**
 * Manifest of elasticsearch core services.
 *
 * @module elasticsearch/lib/es_services/search
 */

const rootPrefix = '../..',
  logger = require(rootPrefix + '/providers/logger'),
  esClient = require(rootPrefix + '/providers/es'),
  responseHelper = require(rootPrefix + '/providers/responseHelper'),
  DEFAULT_RESULT_SIZE = 50;

class Service {
  constructor(config, params) {
    if (!config) {
      throw 'Config is mandatory for ES search service.';
    }

    const oThis = this,
      esConfig = config.elasticSearch;

    oThis.params = params || {};
    oThis.requestBody = {};
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
          internal_error_identifier: 'l_es_s_es_s_p',
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
        .search(oThis.buildParams())
        .then(function(clientResponse) {
          logger.win(`search Operation Successful and took ${clientResponse.took} ms`);
          logger.debug('params', params);
          logger.debug('search Operation clientResponse:', clientResponse);
          if (clientResponse.timed_out) {
            return responseHelper.error({
              internal_error_identifier: 'l_es_s_es_s_as_to',
              api_error_identifier: 'elasticsearch_api_timeout',
              debug_options: {
                error_details: clientResponse
              }
            });
          }
          try {
            oThis.formatSearchResponse(params, clientResponse);
          } catch (e) {
            logger.error(e);
          }
          return responseHelper.successWithData(oThis.formatSearchResponse(params, clientResponse));
        })
        .catch(function(clientError) {
          logger.error('search Operation Failed!');
          logger.debug('params', params);
          logger.debug('clientError', clientError);
          return responseHelper.error({
            internal_error_identifier: 'l_es_s_es_s_ap_c',
            api_error_identifier: 'elasticsearch_api_error',
            debug_options: {
              error_details: clientError
            }
          });
        });
    } catch (e) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_es_s_es_s_ap_in_p',
          api_error_identifier: ''
        })
      );
    }
  }

  buildParams() {
    const oThis = this,
      finalParams = Object.assign({}, oThis.params, oThis.actionDescription);

    oThis.requestBody.size = oThis.requestBody.size || DEFAULT_RESULT_SIZE;
    finalParams['body'] = oThis.requestBody;
    finalParams['_source'] = oThis.requestSource;

    return finalParams;
  }

  setActionDescription(actionDescription) {
    const oThis = this;
    oThis.actionDescription = actionDescription;
  }

  setRequestSource(requestSource) {
    const oThis = this;
    if (requestSource instanceof Array && requestSource.length > 0) {
      oThis.requestSource = requestSource;
    }
  }

  setRequestBody(requestBody) {
    const oThis = this;
    oThis.requestBody = requestBody;
  }

  formatSearchResponse(params, response) {
    let hits1 = response.hits,
      total = hits1.total,
      hits2 = hits1.hits,
      next_page_payload = {},
      meta = {
        total_records: total,
        next_page_payload: next_page_payload,
        has_next_page: false
      },
      results = [],
      resultType = params.index,
      data = {
        meta: meta
      },
      paramsFrom = 0,
      paramsSize = hits2.length;

    if (params.body) {
      paramsFrom = params.body.from || 0;
      paramsSize = params.body.size || paramsSize;
    }

    //Format data
    data[resultType] = results;
    data['result_type'] = resultType;

    //See if we have next page.
    //E.g.
    //-- total = 25
    //-- So, last result index = 25 - 1 = 24
    //-- paramsSize = 10

    //-- if paramsFrom = 10
    //-- last search result index = 10 + 10 - 1 = 19
    // 24 > 19 = true (we have next page)

    //-- if paramsFrom = 15
    //-- last search result index = 10 + 15 - 1 = 24
    // 24 > 24 = false (we do not have next page).

    //-- if paramsFrom = 14
    //-- last search result index = 10 + 14 - 1 = 23
    // 24 > 23 = true (we have next page with 1 result)

    // So condition becomes:
    // (total - 1) > (paramsSize + paramsFrom - 1)
    // => total > paramsSize + paramsFrom

    if (total > paramsSize + paramsFrom) {
      // We have next page.
      meta.has_next_page = true;
      let query = {};
      if (params.body) {
        let requestBody = JSON.parse(JSON.stringify(params.body));
        Object.assign(next_page_payload, requestBody);
      }

      next_page_payload.from = paramsFrom + paramsSize;
      next_page_payload.size = paramsSize;
    }

    let len = hits2.length,
      cnt,
      record;

    for (cnt = 0; cnt < len; cnt++) {
      record = hits2[cnt];
      results.push(record._source);
    }

    return data;
  }
}

module.exports = Service;
