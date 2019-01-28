'use strict';
/**
 * This service starts the token minting process
 *
 * @module app/services/token/StartMint
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  TokenCache = require(rootPrefix + '/lib/kitSaasSharedCacheManagement/Token'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  WorkflowStepsModel = require(rootPrefix + '/app/models/mysql/WorkflowStep'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  ClientConfigGroupCache = require(rootPrefix + '/lib/sharedCacheManagement/ClientConfigGroup');

/**
 * Class for Start Mint
 *
 * @class
 */
class StartMint {
  /**
   * Constructor for start mint
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.token_id;
    oThis.clientId = params.client_id;
    oThis.approveTransactionHash = params.approve_transaction_hash;
    oThis.requestStakeTransactionHash = params.request_stake_transaction_hash;
  }

  /**
   * perform
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('app/services/token/StartMint::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'a_s_t_sm_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * asyncPerform
   *
   * @return {Promise<any>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis._validateAndSanitize();

    await oThis.startMinting();
  }

  /**
   *
   * @returns {Promise<*>}
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    if (
      !basicHelper.isTxHashValid(oThis.approveTransactionHash) ||
      !basicHelper.isTxHashValid(oThis.requestStakeTransactionHash)
    ) {
      logger.error('Approve Transaction hash is not passed or wrong in input parameters.');
      return responseHelper.error({
        internal_error_identifier: 's_t_sm_3',
        api_error_identifier: 'invalid_params',
        debug_options: {}
      });
    }
  }
  /**
   * Start minting
   *
   * @return {Promise<*|result>}
   */
  async startMinting() {
    const oThis = this;

    //Todo: Insert logic to start minting process
  }

  /**
   * Fetch config group for the client. If config group is not assigned for the client, assign one.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchConfigGroup() {
    const oThis = this;

    // Fetch client config group.
    let clientConfigStrategyCacheObj = new ClientConfigGroupCache({ clientId: oThis.clientId }),
      fetchCacheRsp = await clientConfigStrategyCacheObj.fetch();

    // Config group is not associated for the given client.
    if (fetchCacheRsp.isFailure()) {
      // Assign config group for the client.
      logger.error('Config strategy is not assigned');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_t_sm_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
    // Config group is already associated for the given client.
    else {
      oThis.chainId = fetchCacheRsp.data[oThis.clientId].chainId;
    }
  }

  /**
   * Fetch latest workflow details for the client.
   *
   * @param {String/Number} clientId
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _fetchWorkflowDetails(clientId) {
    return await new WorkflowStepsModel()
      .select('*')
      .where({
        client_id: clientId
      })
      .order_by('created_at DESC')
      .limit(1);
  }

  /**
   * Fetch token details
   *
   * @param {String/Number} clientId
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchTokenDetails(clientId) {
    let cacheResponse = await new TokenCache({ clientId: clientId }).fetch();

    if (cacheResponse.isFailure()) {
      logger.error('Could not fetched token details.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_t_sm_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            clientId: clientId
          }
        })
      );
    }
    return cacheResponse.data;
  }

  /***
   *
   * config strategy
   *
   * @return {object}
   */
  get _configStrategy() {
    const oThis = this;
    return oThis.ic().configStrategy;
  }

  /***
   *
   * object of config strategy klass
   *
   * @return {object}
   */
  get _configStrategyObject() {
    const oThis = this;
    if (oThis.configStrategyObj) return oThis.configStrategyObj;
    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);
    return oThis.configStrategyObj;
  }
}

InstanceComposer.registerAsShadowableClass(StartMint, coreConstants.icNameSpace, 'StartMint');
