'use strict';

const BrandedToken = require('@openstfoundation/brandedtoken.js');

const rootPrefix = '../..',
  CoreBins = require(rootPrefix + '/config/CoreBins');

class VerifierHelper {
  constructor(web3Instance) {
    const oThis = this;

    oThis.web3Instance = web3Instance;
  }

  async validateSimpleTokenContract(STContractAddress) {
    const oThis = this;

    let deployedCode = await oThis.web3Instance.eth.getCode(STContractAddress),
      coreBinCode = CoreBins.simpleToken;

    let chainCode = deployedCode.slice(parseInt(deployedCode.length) - 50, parseInt(deployedCode.length));

    return coreBinCode.indexOf(chainCode) !== -1;
  }

  async validateContract(contractAddress, contractName) {
    const oThis = this;

    let deployedCode = await oThis.web3Instance.eth.getCode(contractAddress),
      binCode = await oThis._getBIN(contractName);

    deployedCode = deployedCode.slice(2);

    let chainCode = deployedCode.slice(parseInt(deployedCode.length) - 100, parseInt(deployedCode.length));

    return binCode.indexOf(chainCode) !== -1;
  }

  async getContractObj(contractName, contractAddress) {
    const oThis = this;

    let abiOfOrganization = await oThis._getABI(contractName);

    return new oThis.web3Instance.eth.Contract(abiOfOrganization, contractAddress);
  }

  static get AbiBinProviderHelper() {
    return BrandedToken.AbiBinProvider;
  }

  async _getABI(organizationName) {
    const oThis = this;

    return await new VerifierHelper.AbiBinProviderHelper().getABI(organizationName);
  }

  async _getBIN(contractName) {
    const oThis = this;

    return await new VerifierHelper.AbiBinProviderHelper().getBIN(contractName);
  }

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

  /*
    this function returns contract name for provided lib kind.
   */
  getLibNameFromKind(libKind) {
    if (libKind === 'merklePatriciaProofLib') {
      return 'MerklePatriciaProof';
    }
    if (libKind === 'messageBusLib') {
      return 'MessageBus';
    }
    if (libKind === 'gatewayLib') {
      return 'GatewayLib';
    }
  }
}

module.exports = VerifierHelper;
