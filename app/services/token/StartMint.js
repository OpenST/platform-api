/**
 * Module to start the token minting process.
 *
 * @module app/services/token/StartMint
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  tokenConstants = require(rootPrefix + '/lib/globalConstant/token'),
  StakeCurrencyBTConverter = require(rootPrefix + '/lib/StakeCurrencyBTConverter'),
  BtStakeAndMintRouter = require(rootPrefix + '/lib/workflow/stakeAndMint/brandedToken/Router'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  ServiceBase = require(rootPrefix + '/app/services/Base');

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
   * @param {string} params.stake_currency_to_stake
   * @param {string} params.bt_to_mint
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
    oThis.stakerAddress = params.staker_address;

    oThis.feStakeCurrencyToStake = params.fe_stake_currency_to_stake;
    oThis.feBtToMint = params.fe_bt_to_mint;

    oThis.stakeCurrencyToStakeInWei = params.stake_currency_to_stake;
    oThis.btToMintInWei = params.bt_to_mint;

    // optional params
    oThis.approveTransactionHash = params.approve_transaction_hash;
    oThis.requestStakeTransactionHash = params.request_stake_transaction_hash;

    oThis.tokenHasManagedOwner = null;
    oThis.tokenAddresses = null;
  }

  /**
   * asyncPerform
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

    await oThis._fetchTokenDetails();

    await oThis._validateAmounts();

    if (oThis.token.status !== tokenConstants.deploymentCompleted) {
      return responseHelper.error({
        internal_error_identifier: 'a_s_t_sm_1',
        api_error_identifier: 'token_not_deployed',
        debug_options: {}
      });
    }

    await oThis._validateTxHashes();

    await oThis._fetchTokenAddresses();

    await oThis._validateAndSanitizeStakerAddress();
  }

  /**
   * Validate Amounts.
   *
   * @private
   */
  _validateAmounts() {
    const oThis = this;

    if (oThis._tokenHasManagedOwner()) {
      let stakeCurrencyBTConverterObj = new StakeCurrencyBTConverter({
          conversionFactor: oThis.token.conversionFactor
        }),
        computedBTCurrencyInWei = stakeCurrencyBTConverterObj.convertStakeCurrencyToBT(oThis.stakeCurrencyToStakeInWei);

      if (computedBTCurrencyInWei !== oThis.btToMintInWei) {
        return responseHelper.error({
          internal_error_identifier: 'a_s_t_sm_6',
          api_error_identifier: 'stake_currency_bt_conversion_mismatch',
          debug_options: {}
        });
      }
    }
  }

  /**
   * Validate Tx Hashes.
   *
   * @private
   */
  _validateTxHashes() {
    const oThis = this;

    if (oThis._tokenHasManagedOwner()) {
      if (
        !CommonValidators.isVarNull(oThis.approveTransactionHash) ||
        !CommonValidators.isVarNull(oThis.requestStakeTransactionHash)
      ) {
        return responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_t_sm_4',
          api_error_identifier: 'invalid_params',
          debug_options: {}
        });
      }
    }
  }

  /**
   * Set token addresses
   *
   * @private
   *
   */
  async _fetchTokenAddresses() {
    const oThis = this;

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    if (getAddrRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_t_sm_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.tokenAddresses = getAddrRsp.data;
  }

  /**
   *
   * Checks if token owner is managed by OST
   *
   * @return {boolean}
   * @private
   */
  _tokenHasManagedOwner() {
    const oThis = this;

    if (!CommonValidators.isVarNull(oThis.tokenHasManagedOwner)) {
      return oThis.tokenHasManagedOwner;
    }

    oThis.tokenHasManagedOwner = oThis.token.properties.includes(tokenConstants.hasOstManagedOwnerProperty);

    return oThis.tokenHasManagedOwner;
  }

  /**
   * Validate or set staker address.
   *
   * @private
   */
  _validateAndSanitizeStakerAddress() {
    const oThis = this;

    if (oThis._tokenHasManagedOwner()) {
      oThis.stakerAddress = oThis.tokenAddresses[tokenAddressConstants.ownerAddressKind];
    } else {
      if (oThis.stakerAddress !== oThis.tokenAddresses[tokenAddressConstants.ownerAddressKind]) {
        return Promise.reject(
          responseHelper.paramValidationError({
            internal_error_identifier: 'a_s_t_sm_3',
            api_error_identifier: 'something_went_wrong',
            params_error_identifiers: ['invalid_staker_address'],
            debug_options: { stakerAddress: oThis.stakerAddress }
          })
        );
      }
    }
  }

  /**
   * Start minting.
   *
   * @return {Promise<*|result>}
   */
  async startMinting() {
    const oThis = this;

    let requestParams = {
        tokenId: oThis.tokenId,
        clientId: oThis.clientId,
        auxChainId: oThis._configStrategyObject.auxChainId,
        originChainId: oThis._configStrategyObject.originChainId,
        sourceChainId: oThis._configStrategyObject.originChainId,
        destinationChainId: oThis._configStrategyObject.auxChainId,
        stakerAddress: oThis.stakerAddress,
        //optional params
        approveTransactionHash: oThis.approveTransactionHash,
        requestStakeTransactionHash: oThis.requestStakeTransactionHash,
        // amounts
        btToMintInWei: oThis.btToMintInWei,
        stakeCurrencyToStakeInWei: oThis.stakeCurrencyToStakeInWei
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
