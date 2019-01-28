'use strict';
/**
 * Cache for workflows table.
 *
 * @module lib/kitSaasSharedCacheManagement/Workflow
 */
const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  WorkflowModel = require(rootPrefix + '/app/models/mysql/Workflow'),
  BaseCacheManagement = require(rootPrefix + '/lib/kitSaasSharedCacheManagement/Base');

/**
 * Class for workflows table cache
 *
 * @class
 */
class Workflow extends BaseCacheManagement {
  /**
   * Constructor for workflows table cache
   *
   * @param {Object} params - cache key generation & expiry related params
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.workflowId = params.workflowId;

    // Call sub class method to set cache key using params provided
    oThis._setCacheKeySuffix();

    // Call sub class method to set cache expiry using params provided
    oThis._setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis._setCacheImplementer();
  }

  /**
   * Set cache key
   *
   * @return {String}
   */
  _setCacheKeySuffix() {
    const oThis = this;

    oThis.cacheKeySuffix = 'c_w_f_' + oThis.workflowId;
    // oThis.cacheKey = oThis._sharedCacheKeyPrefix() + 'c_c_wf_' + oThis.workflowId;
    //
    // return oThis.cacheKey;
  }

  /**
   * Set cache expiry in oThis.cacheExpiry and return it
   *
   * @return {Number}
   */
  _setCacheExpiry() {
    const oThis = this;

    oThis.cacheExpiry = 24 * 60 * 60; // 24 hours ;

    return oThis.cacheExpiry;
  }

  /**
   * Fetch data from source
   *
   * @return {Result}
   */
  async _fetchDataFromSource() {
    const oThis = this;

    let workflowDetails = await new WorkflowModel()
      .select('*')
      .where({
        id: oThis.workflowId
      })
      .fire();

    if (workflowDetails.length !== 1) {
      return responseHelper.error({
        internal_error_identifier: 'l_scm_w_1',
        api_error_identifier: 'invalid_api_params',
        debug_options: { workflowId: oThis.workflowId }
      });
    }

    let responseData = {};
    responseData[oThis.workflowId] = {
      clientId: workflowDetails[0].client_id,
      requestParams: workflowDetails[0].request_params
    };

    return responseHelper.successWithData(responseData);
  }
}

module.exports = Workflow;
