/**
 * Module to start the token minting process.
 *
 * @module app/services/token/StartMint
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  BtStakeAndMintRouter = require(rootPrefix + '/lib/workflow/stakeAndMint/brandedToken/Router'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic');

/**
 * Class to start the token minting process.
 *
 * @class StartMint
 */
class StartMint extends ServiceBase {
  /**
   * Constructor to start the token minting process.
   *
   * @param {object} params
   * @param {number/string} params.token_id
   * @param {number/string} params.client_id
   * @param {string} params.approve_transaction_hash
   * @param {string} params.request_stake_transaction_hash
   * @param {string} params.staker_address
   * @param {string} params.fe_stake_currency_to_stake
   * @param {string} params.fe_bt_to_mint
   *
   * @augments ServiceBase
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.tokenId = params.token_id;
    oThis.clientId = params.client_id;
    oThis.approveTransactionHash = params.approve_transaction_hash;
    oThis.requestStakeTransactionHash = params.request_stake_transaction_hash;
    oThis.stakerAddress = params.staker_address;
    oThis.feStakeCurrencyToStake = params.fe_stake_currency_to_stake;
    oThis.feBtToMint = params.fe_bt_to_mint;
  }

  /**
   * Async perform.
   *
   * @return {Promise<any>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateAndSanitize();

    return oThis.startMinting();
  }

  /**
   * Validate and sanitize.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    if (
      !basicHelper.isTxHashValid(oThis.approveTransactionHash) ||
      !basicHelper.isTxHashValid(oThis.requestStakeTransactionHash) ||
      !basicHelper.isEthAddressValid(oThis.stakerAddress)
    ) {
      logger.error('Parameters passed are incorrect.');

      return responseHelper.error({
        internal_error_identifier: 'a_s_t_sm_1',
        api_error_identifier: 'invalid_params',
        debug_options: {}
      });
    }
  }

  /**
   * Start minting.
   *
   * @return {Promise<*|result>}
   */
  async startMinting() {
    const oThis = this;

    const requestParams = {
        approveTransactionHash: oThis.approveTransactionHash,
        requestStakeTransactionHash: oThis.requestStakeTransactionHash,
        auxChainId: oThis._configStrategyObject.auxChainId,
        originChainId: oThis._configStrategyObject.originChainId,
        stakerAddress: oThis.stakerAddress,
        tokenId: oThis.tokenId,
        clientId: oThis.clientId,
        sourceChainId: oThis._configStrategyObject.originChainId,
        destinationChainId: oThis._configStrategyObject.auxChainId
      },
      stakeAndMintParams = {
        stepKind: workflowStepConstants.btStakeAndMintInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: oThis._configStrategyObject.originChainId,
        topic: workflowTopicConstant.btStakeAndMint,
        requestParams: requestParams,
        feResponseData: { fe_stake_currency_to_stake: oThis.feStakeCurrencyToStake, fe_bt_to_mint: oThis.feBtToMint }
      };

    const brandedTokenRouterObj = new BtStakeAndMintRouter(stakeAndMintParams);

    return brandedTokenRouterObj.perform();
  }

  /**
   * Config strategy.
   *
   * @return {object}
   */
  get _configStrategy() {
    const oThis = this;

    return oThis.ic().configStrategy;
  }

  /**
   * Object of config strategy class.
   *
   * @sets oThis.configStrategyObj
   *
   * @return {object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) {
      return oThis.configStrategyObj;
    }

    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);

    return oThis.configStrategyObj;
  }
}

InstanceComposer.registerAsShadowableClass(StartMint, coreConstants.icNameSpace, 'StartMint');
