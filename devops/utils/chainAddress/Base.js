'use strict';

/**
 * Generate address for Origin and Auxiliary chains
 *
 * @module devops/utils/GenerateAddress
 */
const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  GenerateChainKnownAddresses = require(rootPrefix + '/tools/helpers/GenerateChainKnownAddresses'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  TransferAmountOnChain = require(rootPrefix + '/tools/helpers/TransferAmountOnChain');

const originMaxGasPriceMultiplierWithBuffer = basicHelper.getOriginMaxGasPriceMultiplierWithBuffer();

/**
 * Class for Generating addresses for Origin and Auxiliary chains
 *
 * @class
 */
class Base {
  /**
   * Constructor
   *
   * @param configFilePath
   *
   * @constructor
   */
  constructor() {
    const oThis = this;
    oThis.chainId = null;
    oThis.chainKind = null;
  }

  /**
   *
   * Perform
   *
   * @return {Promise<result>}
   *
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('devops/utils/GenerateAddress.js::perform::catch', error);
        return oThis._getRespError('do_u_ca_b_p1');
      }
    });
  }

  /**
   * Generate addresses required for chain
   *
   * @param addressKinds {Array} - List of address kinds to generate
   *
   * @returns {Promise<*>}
   * @private
   */
  async _generateAddresses(addressKinds) {
    const oThis = this;

    let generateChainKnownAddresses = new GenerateChainKnownAddresses({
      addressKinds: addressKinds,
      chainKind: oThis.chainKind,
      chainId: oThis.chainId
    });

    let generateAddrRsp = await generateChainKnownAddresses.perform();

    if (!generateAddrRsp.isSuccess()) {
      logger.error(`Address generation failed for chain kind: ${oThis.chainKind} -- chain id: ${oThis.chainId}`);
      return oThis._getRespError('do_u_ca_b_ga_1');
    }

    logger.info('Generate Addresses Response: ', generateAddrRsp.toHash());

    let addresses = generateAddrRsp.data['addressKindToValueMap'];

    return responseHelper.successWithData({ addresses: addresses });
  }

  /**
   * Fund address with ETH
   *
   * @param address {string} - address to fund ETH to
   * @param amount {Number} - amount in eth which is to be funded
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _fundAddressWithEth(address, amount) {
    const oThis = this;

    let providers = await oThis._getProvidersFromConfig(),
      provider = providers.data[0], //select one provider from provider endpoints array
      amountInWei = basicHelper
        .convertToWei(String(amount))
        .mul(basicHelper.convertToBigNumber(originMaxGasPriceMultiplierWithBuffer))
        .toString(10);

    await TransferAmountOnChain._fundAddressWithEth(address, oThis.originChainId, provider, amountInWei);
  }

  /**
   * get providers from config
   *
   * @returns {Promise<any>}
   * @private
   */
  async _getProvidersFromConfig() {
    const oThis = this;

    let csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth],
      readWriteConfig = configForChain[configStrategyConstants.gethReadWrite],
      providers = readWriteConfig.wsProvider ? readWriteConfig.wsProviders : readWriteConfig.rpcProviders;

    oThis.originChainId = configForChain.chainId;

    return responseHelper.successWithData(providers);
  }

  /**
   * Generate Error response
   *
   * @param code {String} - Error internal identifier
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getRespError(code) {
    const oThis = this;

    return responseHelper.error({
      internal_error_identifier: code,
      api_error_identifier: 'something_went_wrong',
      debug_options: {}
    });
  }
}

module.exports = Base;
