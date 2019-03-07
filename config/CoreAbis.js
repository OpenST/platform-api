'use strict';

/**
 * Load all required contract abi files and export them.<br><br>
 *
 * @module config/core_abis
 */

const fs = require('fs'),
  path = require('path'),
  MosaicJs = require('@openstfoundation/mosaic.js'),
  BrandedToken = require('@openstfoundation/brandedtoken.js'),
  OpenSTJs = require('@openstfoundation/openst.js');

const rootPrefix = '..',
  contractNameConstants = require(rootPrefix + '/lib/globalConstant/contractName');

const nameToAbiMap = {};

function parseFile(filePath, options) {
  filePath = path.join(__dirname, '/' + filePath);
  const fileContent = fs.readFileSync(filePath, options || 'utf8');
  return JSON.parse(fileContent);
}

/**
 * Constructor for openST core contract abis
 *
 * @constructor
 */

class CoreAbis {
  constructor() {}

  /**
   * Value Chain Contract: simple token EIP20 contract ABI.<br><br>
   *
   * @constant {object}
   *
   */
  static get simpleToken() {
    if (nameToAbiMap['simpleToken']) return nameToAbiMap['simpleToken'];
    nameToAbiMap['simpleToken'] = parseFile(rootPrefix + '/contracts/abi/SimpleToken.abi', 'utf8');
    return nameToAbiMap['simpleToken'];
  }

  /**
   * Get abi
   *
   * @param contractName
   * @returns {String}
   */
  static getAbi(contractName) {
    switch (contractName) {
      case contractNameConstants.tokenHolderContractName:
      case contractNameConstants.tokenRuleContractName:
      case contractNameConstants.userWalletFactoryContractName:
      case contractNameConstants.proxyFactoryContractName:
      case contractNameConstants.gnosisSafeContractName:
        return new OpenSTJs.AbiBinProvider().getABI(contractName);

      case contractNameConstants.utilityBrandedTokenContractName:
      case contractNameConstants.brandedTokenContractName:
      case contractNameConstants.gatewayComposerContractName:
        return new BrandedToken.AbiBinProvider().getABI(contractName);

      case contractNameConstants.organizationContractName:
      case contractNameConstants.eip20GatewayContractName:
      case contractNameConstants.eip20CoGatewayContractName:
      case contractNameConstants.merklePatriciaProofContractName:
      case contractNameConstants.messageBusContractName:
      case contractNameConstants.gatewayLibContractName:
      case contractNameConstants.OSTPrimeContractName:
      case contractNameConstants.AnchorContractName:
        return new MosaicJs.AbiBinProvider().getABI(contractName);
    }
  }
}

module.exports = CoreAbis;
