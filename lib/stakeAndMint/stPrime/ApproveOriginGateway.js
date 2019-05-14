/**
 * Module to help in Approving Gateway contract in Simple Token (Base token contract) for Stake amount.
 *
 * @module lib/stakeAndMint/stPrime/Approve
 */

const BigNumber = require('bignumber.js'),
  MosaicJs = require('@openst/mosaic.js');

const rootPrefix = '../../..',
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  DynamicGasPriceCache = require(rootPrefix + '/lib/cacheManagement/shared/EstimateOriginChainGasPrice'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  stakeCurrencyConstants = require(rootPrefix + '/lib/globalConstant/stakeCurrency'),
  pendingTransactionConstants = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  StakeCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyBySymbol');

/**
 * Class for approving gateway contract in Simple Token for Stake amount.
 *
 * @class ApproveOriginGatewayInBase
 */
class ApproveOriginGatewayInBase extends StakeAndMintBase {
  /**
   * Constructor for approving gateway contract in Simple Token for Stake amount.
   *
   * @param {object} params
   * @param {number} params.originChainId
   * @param {number} params.auxChainId
   * @param {string} params.stakerAddress
   * @param {number} params.amountToStake
   *
   * @augments StakeAndMintBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.auxChainId = params.auxChainId;
    oThis.stakerAddress = params.stakerAddress;
    oThis.amountToStake = params.amountToStake;

    oThis.gatewayContract = null;
    oThis.baseContract = null;
    oThis.amountToApprove = null;
  }

  /**
   * Async perform.
   *
   * @return {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    oThis.amountToApprove = new BigNumber(oThis.amountToStake);
    if (!oThis.amountToApprove) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_smm_sp_agib_1',
          api_error_identifier: 'amount_invalid',
          debug_options: {}
        })
      );
    }

    await oThis._setOriginWeb3Instance();

    await oThis._fetchRequiredAddresses();

    // If contract addresses are not found.
    if (!oThis.gatewayContract || !oThis.baseContract) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_smm_sp_agib_2',
          api_error_identifier: 'contract_not_found',
          debug_options: {}
        })
      );
    }

    const resp = await oThis._sendApproveTransaction();

    if (resp.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          transactionHash: resp.data.transactionHash,
          taskResponseData: { chainId: oThis.originChainId, transactionHash: resp.data.transactionHash }
        })
      );
    }

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskFailed,
        taskResponseData: { err: JSON.stringify(resp) }
      })
    );
  }

  /**
   * Fetch required addresses.
   *
   * @sets oThis.gatewayContract, oThis.baseContract
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchRequiredAddresses() {
    const oThis = this;

    // Fetch gateway contract address.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.gatewayContract = chainAddressesRsp.data[chainAddressConstants.originGatewayContractKind].address;

    // Fetch base(simple token) contract address.
    let stakeCurrencyDetails = await new StakeCurrencyBySymbolCache({
      stakeCurrencySymbols: [stakeCurrencyConstants.OST]
    }).fetch();

    if (stakeCurrencyDetails.isFailure()) {
      logger.error('Error in fetch stake currency details');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_smm_sp_agib_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.baseContract = stakeCurrencyDetails.data[stakeCurrencyConstants.OST].contractAddress;
  }

  /**
   * Send approve transaction.
   *
   * @return {Promise<void>}
   * @private
   */
  async _sendApproveTransaction() {
    const oThis = this;

    const mosaicStakeHelper = new MosaicJs.Helpers.StakeHelper(),
      txObject = mosaicStakeHelper._approveStakeAmountRawTx(
        oThis.amountToApprove.toString(10),
        {},
        oThis.originWeb3,
        oThis.baseContract,
        oThis.gatewayContract,
        oThis.stakerAddress
      );

    const originGasPrice = await oThis._fetchGasPrice(),
      data = txObject.encodeABI(),
      txOptions = {
        gasPrice: originGasPrice,
        gas: contractConstants.approveErc20TokenGas
      };

    return oThis.performTransaction(
      oThis.originChainId,
      oThis.originShuffledProviders[0],
      oThis.stakerAddress,
      oThis.baseContract,
      txOptions,
      data
    );
  }

  /**
   * Get origin chain dynamic gas price.
   *
   * @return {Promise<*>}
   * @private
   */
  async _fetchGasPrice() {
    const dynamicGasPriceResponse = await new DynamicGasPriceCache().fetch();

    return dynamicGasPriceResponse.data;
  }

  /**
   * Get submit transaction parameters.
   *
   * @return {object}
   */
  get _customSubmitTxParams() {
    return {
      pendingTransactionKind: pendingTransactionConstants.stPrimeApproveKind
    };
  }
}

module.exports = ApproveOriginGatewayInBase;
