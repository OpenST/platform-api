'use strict';
/**
 * Deploy simpleToken
 *
 * @module tools/chainSetup/origin/simpleTokenPrime/Deploy
 */

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  SetupSTPrimeBase = require(rootPrefix + '/tools/chainSetup/aux/simpleTokenPrime/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  stakeCurrencyConstants = require(rootPrefix + '/lib/globalConstant/stakeCurrency'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  chainSetupConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  StakeCurrencyBySymbolCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/StakeCurrencyBySymbol');

/**
 *
 * @class
 */
class DeploySimpleTokenPrime extends SetupSTPrimeBase {
  /**
   * Constructor
   *
   * @param {Object} params
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.chainId = params.chainId;
  }

  /**
   * asyncPerform
   *
   * @ignore
   *
   * @return {Promise}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchOriginAddresses();
    await oThis._fetchAuxAddresses();

    let deployerKey = await oThis._fetchPrivateKey(oThis.deployerAddress);

    oThis._addKeyToWallet(deployerKey);

    let nonceRsp = await oThis._fetchNonce(oThis.deployerAddress);

    let txOptions = {
      gasPrice: contractConstants.zeroGasPrice,
      from: oThis.deployerAddress,
      nonce: nonceRsp.data['nonce'],
      chainId: oThis.chainId,
      gas: contractConstants.deployStPrimeGas
    };

    let helperObj = new SetupSTPrimeBase.STPrimeSetupHelper(oThis._web3Instance),
      deployerResponse = await helperObj
        .deploy(oThis.simpleTokenAddress, oThis.organizationAddress, txOptions)
        .then(function(txReceipt) {
          logger.debug('txReceipt', txReceipt);
          return responseHelper.successWithData({
            transactionReceipt: txReceipt,
            transactionHash: txReceipt.transactionHash,
            contractAddress: txReceipt.contractAddress
          });
        })
        .catch(function(errorResponse) {
          logger.error(errorResponse);
          return responseHelper.error({
            internal_error_identifier: 't_cs_a_stp_d_1',
            api_error_identifier: 'unhandled_catch_response',
            debug_options: {}
          });
        });

    oThis._removeKeyFromWallet(deployerKey);

    deployerResponse.debugOptions = {
      inputParams: {},
      processedParams: {
        chainId: oThis._auxChainId,
        deployerAddress: oThis.deployerAddress,
        simpleTokenAddress: oThis.simpleTokenAddress,
        organizationAddress: oThis.organizationAddress
      }
    };

    await oThis._insertIntoChainSetupLogs(chainSetupConstants.deployBaseContractStepKind, deployerResponse);

    await oThis._insertIntoChainAddress(deployerResponse);

    return deployerResponse;
  }

  /**
   * fetch required origin addresses
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _fetchOriginAddresses() {
    const oThis = this;

    // Fetch simple token contract address
    let stakeCurrencyDetails = await new StakeCurrencyBySymbolCache({
      stakeCurrencySymbols: [stakeCurrencyConstants.OST]
    }).fetch();

    if (stakeCurrencyDetails.isFailure()) {
      logger.error('Error in fetch stake currency details');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_a_stp_d_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.simpleTokenAddress = stakeCurrencyDetails.data[stakeCurrencyConstants.OST].contractAddress;
  }

  /**
   * fetch required aux addresses
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _fetchAuxAddresses() {
    const oThis = this;

    // Fetch all addresses associated with aux chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis._auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_a_stp_d_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.deployerAddress = chainAddressesRsp.data[chainAddressConstants.auxDeployerKind].address;
    oThis.organizationAddress = chainAddressesRsp.data[chainAddressConstants.stPrimeOrgContractKind].address;
  }

  /***
   *
   * insert STPrime contract address into chain address
   *
   * @return {Promise}
   *
   * @private
   */
  async _insertIntoChainAddress(deployerResponse) {
    const oThis = this;

    if (deployerResponse.isFailure()) return deployerResponse;

    await new ChainAddressModel().insertAddress({
      address: deployerResponse.data['contractAddress'],
      associatedAuxChainId: oThis._auxChainId,
      addressKind: chainAddressConstants.stPrimeContractKind,
      deployedChainId: oThis._auxChainId,
      deployedChainKind: coreConstants.auxChainKind,
      status: chainAddressConstants.activeStatus
    });

    // Clear chain address cache.
    await new ChainAddressCache({ associatedAuxChainId: oThis._auxChainId }).clear();
  }
}

InstanceComposer.registerAsShadowableClass(DeploySimpleTokenPrime, coreConstants.icNameSpace, 'DeploySimpleTokenPrime');

module.exports = DeploySimpleTokenPrime;
