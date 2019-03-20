'use strict';

/**
 * Load all required contract abi files and export them.<br><br>
 *
 * @module config/core_abis
 */

const fs = require('fs'),
  path = require('path'),
  MosaicJs = require('@openst/mosaic.js'),
  BrandedToken = require('@openst/brandedtoken.js'),
  OpenSTJs = require('@openst/openst.js');

const rootPrefix = '..',
  contractNameConstants = require(rootPrefix + '/lib/globalConstant/contractName'),
  nameToBinMap = {};

function readFile(filePath, options) {
  filePath = path.join(__dirname, '/' + filePath);
  return fs.readFileSync(filePath, options || 'utf8');
}

/**
 * Constructor for openST core contract abis
 *
 * @constructor
 */

class CoreBins {
  constructor() {}

  /**
   * Value Chain Contract: simple token EIP20 contract ABI.<br><br>
   *
   * @constant {object}
   *
   */
  static get simpleToken() {
    if (nameToBinMap['simpleToken']) return nameToBinMap['simpleToken'];
    nameToBinMap['simpleToken'] = readFile(rootPrefix + '/contracts/bin/SimpleToken.bin', 'utf8');
    return nameToBinMap['simpleToken'];
  }

  /**
   * Get bin
   *
   * @param contractName
   * @returns {String}
   */
  static getBin(contractName) {
    switch (contractName) {
      case contractNameConstants.tokenHolderContractName:
      case contractNameConstants.tokenRuleContractName:
      case contractNameConstants.userWalletFactoryContractName:
      case contractNameConstants.proxyFactoryContractName:
      case contractNameConstants.gnosisSafeContractName:
        return new OpenSTJs.AbiBinProvider().getABI(contractName);

      case contractNameConstants.brandedTokenContractName:
      case contractNameConstants.utilityBrandedTokenContractName:
      case contractNameConstants.gatewayComposerContractName:
        return new BrandedToken.AbiBinProvider().getBIN(contractName);

      case contractNameConstants.organizationContractName:
      case contractNameConstants.eip20GatewayContractName:
      case contractNameConstants.eip20CoGatewayContractName:
      case contractNameConstants.merklePatriciaProofContractName:
      case contractNameConstants.messageBusContractName:
      case contractNameConstants.gatewayLibContractName:
      case contractNameConstants.OSTPrimeContractName:
      case contractNameConstants.AnchorContractName:
        return new MosaicJs.AbiBinProvider().getBIN(contractName);
    }
  }
}

module.exports = CoreBins;
