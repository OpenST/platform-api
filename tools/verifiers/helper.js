'use strict';

const BrandedToken = require('branded-token.js');

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

    return binCode.indexOf(deployedCode) !== -1;
  }

  async getMosaicTbdContractObj(contractName, contractAddress) {
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
}

module.exports = VerifierHelper;
