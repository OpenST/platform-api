/**
 * Module for cache for workflows table.
 *
 * @module lib/cacheManagement/kitSaas/Workflow
 */

const rootPrefix = '../../..',
  WorkflowModel = require(rootPrefix + '/app/models/mysql/Workflow'),
  BaseCacheManagement = require(rootPrefix + '/lib/cacheManagement/kitSaas/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement');

/**
 * Class for cache for workflows table.
 *
 * @class Workflow
 */
class Workflow extends BaseCacheManagement {
  /**
   * Constructor for cache for workflows table.
   *
   * @param {object} params: cache key generation & expiry related params
   *
   * @augments BaseCacheManagement
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.workflowId = params.workflowId;

    // Call sub class method to set cache level
    oThis._setCacheLevel();

    // Call sub class method to set cache key using params provided
    oThis._setCacheKeySuffix();

    // Call sub class method to set cache expiry using params provided
    oThis._setCacheExpiry();

    // Call sub class method to set cache implementer using params provided
    oThis._setCacheImplementer();
  }

  /**
   *
   * Set cache level
   *
   * @private
   */
  _setCacheLevel() {
    const oThis = this;
    oThis.cacheLevel = cacheManagementConst.kitSaasSubEnvLevel;
  }

  /**
   * Set cache key
   *
   * @return {String}
   */
  _setCacheKeySuffix() {
    const oThis = this;
    oThis.cacheKeySuffix = 'c_w_f_' + oThis.workflowId;
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

    const workflowDetails = await new WorkflowModel()
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

    const responseData = {};
    responseData[oThis.workflowId] = {
      clientId: workflowDetails[0].client_id,
      requestParams: workflowDetails[0].request_params
    };

    return responseHelper.successWithData(responseData);
  }
}

module.exports = Workflow;
