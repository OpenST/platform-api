/**
 * Module for verification helper.
 *
 * @module tools/verifiers/Helper
 */

const MosaicJs = require('@openst/mosaic.js');

const rootPrefix = '../..',
  CoreBins = require(rootPrefix + '/config/CoreBins'),
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

/**
 * Class for verification helper.
 *
 * @class VerifierHelper
 */
class VerifierHelper {
  /**
   * Constructor for verification helper.
   *
   * @param {object} web3Instance
   *
   * @constructor
   */
  constructor(web3Instance) {
    const oThis = this;

    oThis.web3Instance = web3Instance;
  }

  /**
   * Check simple token byte code.
   *
   * @param {string} stContractAddress
   *
   * @return {Promise<boolean>}
   */
  async validateSimpleTokenContract(stContractAddress) {
    const oThis = this;

    const deployedCode = await oThis.web3Instance.eth.getCode(stContractAddress),
      coreBinCode = CoreBins.simpleToken;

    const chainCode = deployedCode.slice(parseInt(deployedCode.length) - 50, parseInt(deployedCode.length));

    return coreBinCode.indexOf(chainCode) !== -1;
  }

  /**
   * Check USDC token byte code.
   *
   * @param {string} usdcContractAddress
   *
   * @return {Promise<boolean>}
   */
  async validateUsdcContract(usdcContractAddress) {
    const oThis = this;

    const deployedCode = await oThis.web3Instance.eth.getCode(usdcContractAddress),
      coreBinCode = CoreBins.usdc;

    const chainCode = deployedCode.slice(parseInt(deployedCode.length) - 50, parseInt(deployedCode.length));

    return coreBinCode.indexOf(chainCode) !== -1;
  }

  /**
   * Validate Contract byte code.
   *
   * @param contractAddress
   * @param contractName
   *
   * @return {Promise<boolean>}
   */
  async validateContract(contractAddress, contractName) {
    const oThis = this,
      binCode = CoreBins.getBin(contractName);

    let deployedCode = await oThis.web3Instance.eth.getCode(contractAddress);

    deployedCode = deployedCode.slice(2);

    const chainCode = deployedCode.slice(parseInt(deployedCode.length) - 100, parseInt(deployedCode.length));

    return binCode.indexOf(chainCode) !== -1;
  }

  /**
   * Get contract object for queries
   *
   * @param {string} contractName
   * @param {string} contractAddress
   *
   * @return {Promise<oThis.web3Instance.eth.Contract>}
   */
  async getContractObj(contractName, contractAddress) {
    const oThis = this;

    const abiOfOrganization = CoreAbis.getAbi(contractName);

    return new oThis.web3Instance.eth.Contract(abiOfOrganization, contractAddress);
  }

  /**
   * Abi and bin provider for branded-token.js.
   *
   * @return {BtAbiBinProvider}
   *
   * @constructor
   */
  static get AbiBinProviderHelper() {
    return MosaicJs.AbiBinProvider;
  }

  /**
   * ==========================================
   * Following methods return contract names for know contracts
   * ==========================================
   */

  get getSimpleTokenContractName() {
    return 'SimpleToken';
  }

  get getSimpleTokenPrimeContractName() {
    return 'OSTPrime';
  }

  get getOrganizationContractName() {
    return 'Organization';
  }

  get getAnchorContractName() {
    return 'Anchor';
  }

  get gatewayContractName() {
    return 'EIP20Gateway';
  }

  get getCoGatewayContractName() {
    return 'EIP20CoGateway';
  }

  /**
   * Returns contract name for provided lib kind.
   *
   * @param {string} libKind
   *
   * @return {*}
   */
  getLibNameFromKind(libKind) {
    switch (libKind) {
      case chainAddressConstants.auxMppLibContractKind:
      case chainAddressConstants.originMppLibContractKind:
        return 'MerklePatriciaProof';
      case chainAddressConstants.auxMbLibContractKind:
      case chainAddressConstants.originMbLibContractKind:
        return 'MessageBus';
      case chainAddressConstants.auxGatewayLibContractKind:
      case chainAddressConstants.originGatewayLibContractKind:
        return 'GatewayLib';
      default:
        return new Error(`Unsupported libKind ${libKind}.`);
    }
  }
}

module.exports = VerifierHelper;
