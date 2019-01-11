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

  async getMosoicTbdContractObj(organizationName, contractAddress) {
    const oThis = this;

    let abiOfOrganization = new VerifierHelper.AbiBinProviderHelper().getABI(organizationName);

    return new oThis.web3Instance.eth.Contract(abiOfOrganization, contractAddress);
  }

  get simpleTokenBinSubStr() {
    return '5820efce56acd8cc472c4bf7a321f62d0c17f4aaaee748e32f8563a6f9f1de7c5ed00029';
  }

  get organizationBinSubStr() {
    return 'a165627a7a723058201162374aa572857d392ca775bb9c0c01465c5381ef34f50633f95487cddb78320029';
  }

  get simpleTokenPrimeBinSubStr() {
    return 'a165627a7a72305820918e707f474974c8b48c93181612a5056b419afb4286b833746af7f480b24e480029';
  }

  get anchorContractBinSubStr() {
    return 'ea165627a7a723058206929121165b48f49d3826d89cdf8e0a5b4177cf58107961c603d2c1e5ac196c20029';
  }

  static get AbiBinProviderHelper() {
    return MosaicTbd.AbiBinProvider;
  }
}

module.exports = VerifierHelper;
