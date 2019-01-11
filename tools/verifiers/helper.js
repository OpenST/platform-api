'use strict';

const MosaicTbd = require('mosaic-tbd');

class VerifierHelper {
  constructor(web3Instance) {
    const oThis = this;

    oThis.web3Instance = web3Instance;
  }

  async verifyDeployedCode(contractAddress, binSubStr) {
    const oThis = this;

    let deployedCode = await oThis.web3Instance.eth.getCode(contractAddress);

    return deployedCode.indexOf(binSubStr) !== -1;
  }

  async validateContract(contractAddress, contractName, web3) {
    const oThis = this;

    let deployedCode = await oThis._getCodeFor(contractAddress, web3);

    let binCode = await oThis._getBinString(contractName);

    return binCode == deployedCode;
  }

  async getMosoicTbdContractObj(organizationName, contractAddress) {
    const oThis = this;

    let abiOfOrganization = new VerifierHelper.AbiBinProviderHelper().getABI(organizationName);

    return new oThis.web3Instance.eth.Contract(abiOfOrganization, contractAddress);
  }

  get simpleTokenBinSubStr() {
    return '5820efce56acd8cc472c4bf7a321f62d0c17f4aaaee748e32f8563a6f9f1de7c5ed00029';
  }

  get organizationBinSubStr() {
    return 'aa572857d392ca775bb9c0c01465c5381ef34f50633f95487cddb78320029';
  }

  get organizationName() {
    return 'MockOrganization';
  }

  static get AbiBinProviderHelper() {
    return MosaicTbd.AbiBinProvider;
  }

  async _getCodeFor(contractAddress, web3) {
    const oThis = this;

    let deployedCode = await web3.eth.getCode(contractAddress);

    return deployedCode;
  }

  async _getBinString(contractName) {
    const oThis = this;

    let contractBin = await oThis.AbiBinProviderHelper().getBIN(contractName);
  }
}

module.exports = VerifierHelper;
