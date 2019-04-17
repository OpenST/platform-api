/**
 * Load all required contract bin files and export them.
 *
 * @module config/coreBins
 */

const fs = require('fs'),
  path = require('path'),
  MosaicJs = require('@openst/mosaic.js'),
  BrandedToken = require('@openst/brandedtoken.js'),
  OpenSTJs = require('@openst/openst.js');

const rootPrefix = '..',
  contractNameConstants = require(rootPrefix + '/lib/globalConstant/contractName');

// Declare variables.
const nameToBinMap = {};

/**
 * Function to read file.
 *
 * @param {string} filePath
 * @param {object} options
 *
 * @return {any}
 */
function readFile(filePath, options) {
  filePath = path.join(__dirname, '/' + filePath);

  return fs.readFileSync(filePath, options || 'utf8');
}

/**
 * Class for OpenST core contract BINs.
 *
 * @class CoreBins
 */
class CoreBins {
  /**
   * Returns SimpleToken BIN.
   *
   * @return {Buffer|*}
   */
  static get simpleToken() {
    if (nameToBinMap.simpleToken) {
      return nameToBinMap.simpleToken;
    }
    nameToBinMap.simpleToken = readFile(rootPrefix + '/contracts/bin/SimpleToken.bin', 'utf8');

    return nameToBinMap.simpleToken;
  }

  /**
   * Returns mockToken BIN.
   *
   * @return {Buffer|*}
   */
  static get mockToken() {
    if (nameToBinMap.mockToken) {
      return nameToBinMap.mockToken;
    }
    nameToBinMap.mockToken = readFile(rootPrefix + '/contracts/bin/MockToken.bin', 'utf8');

    return nameToBinMap.mockToken;
  }

  /**
   * Returns usdc BIN.
   *
   * @return {Buffer|*}
   */
  static get usdc() {
    if (nameToBinMap.usdc) {
      return nameToBinMap.usdc;
    }
    nameToBinMap.usdc = readFile(rootPrefix + '/contracts/bin/USDC.bin', 'utf8');

    return nameToBinMap.usdc;
  }

  /**
   * Get BIN.
   *
   * @param {string} contractName
   *
   * @returns {string}
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
      default:
        console.log(`BIN for contract name ${contractName} does not exist.`);
    }
  }
}

module.exports = CoreBins;
