/**
 * Module to generate addresses for Origin and Auxiliary chains.
 *
 * @module devops/utils/GenerateAddress
 */

const rootPrefix = '../../..',
  TransferEth = require(rootPrefix + '/lib/fund/eth/Transfer'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  GenerateChainKnownAddresses = require(rootPrefix + '/tools/helpers/GenerateChainKnownAddresses'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

// Declare variables.
const originMaxGasPriceMultiplierWithBuffer = basicHelper.getOriginMaxGasPriceMultiplierWithBuffer();

/**
 * Class for generating addresses for Origin and Auxiliary chains.
 *
 * @class Base
 */
class Base {
  /**
   * Constructor for generating addresses for Origin and Auxiliary chains.
   *
   * @params {number} chainId
   *
   * @constructor
   */
  constructor(chainId) {
    const oThis = this;

    oThis.chainId = chainId;

    oThis.chainKind = null;
  }

  /**
   * Perform.
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      }
      logger.error('devops/utils/GenerateAddress.js::perform::catch', error);

      return oThis._getRespError('do_u_ca_b_p1');
    });
  }

  /**
   * Generate addresses required for chain.
   *
   * @param {array} addressKinds: List of address kinds to generate.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _generateAddresses(addressKinds) {
    const oThis = this;

    const generateChainKnownAddresses = new GenerateChainKnownAddresses({
      addressKinds: addressKinds,
      chainKind: oThis.chainKind,
      chainId: oThis.chainId
    });

    const generateAddrRsp = await generateChainKnownAddresses.perform();

    if (!generateAddrRsp.isSuccess()) {
      logger.error(`Address generation failed for chain kind: ${oThis.chainKind} -- chain id: ${oThis.chainId}`);

      return oThis._getRespError('do_u_ca_b_ga_1');
    }

    logger.info('Generate Addresses Response: ', generateAddrRsp.toHash());

    const addresses = generateAddrRsp.data.addressKindToValueMap;

    return responseHelper.successWithData({ addresses: addresses });
  }

  /**
   * Fund address with ETH.
   *
   * @param {string} toAddress: address to fund ETH to
   * @param {string} amount: amount in eth which is to be funded
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fundAddressWithEth(toAddress, amount) {
    const oThis = this;

    await oThis._getOriginChainId();

    const amountInWei = basicHelper
      .convertToLowerUnit(String(amount), coreConstants.ETH_DECIMALS)
      .mul(basicHelper.convertToBigNumber(originMaxGasPriceMultiplierWithBuffer))
      .toString(10);

    await new TransferEth({
      toAddress: toAddress,
      fromAddress: await oThis._fetchMasterInternalFunderAddress(),
      amountInWei: amountInWei,
      waitTillReceipt: 1,
      originChainId: oThis.originChainId
    }).perform();
  }

  /**
   * Fetch master internal funder address.
   *
   * @return {Promise<never>}
   * @private
   */
  async _fetchMasterInternalFunderAddress() {
    // Fetch all addresses from origin chain addresses
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'do_u_ca_b_ga_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return chainAddressesRsp.data[chainAddressConstants.masterInternalFunderKind].address;
  }

  /**
   * Fetch origin chain Id.
   *
   * @sets oThis.originChainId
   *
   * @return {Promise<void>}
   * @private
   */
  async _getOriginChainId() {
    const oThis = this;

    const csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.originGeth),
      configForChain = csResponse.data[configStrategyConstants.originGeth];

    oThis.originChainId = configForChain.chainId;
  }

  /**
   * Generate error response.
   *
   * @param {string} code: Error internal identifier
   *
   * @returns {Promise<void>}
   * @private
   */
  async _getRespError(code) {
    return responseHelper.error({
      internal_error_identifier: code,
      api_error_identifier: 'something_went_wrong',
      debug_options: {}
    });
  }
}

module.exports = Base;
