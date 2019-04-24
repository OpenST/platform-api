/**
 * Load all required contract abi files and export them.
 *
 * @module config/coreAbis
 */

const fs = require('fs'),
  path = require('path'),
  MosaicJs = require('@openst/mosaic.js'),
  BrandedToken = require('@openst/brandedtoken.js'),
  OpenSTJs = require('@openst/openst.js');

const rootPrefix = '..',
  contractNameConstants = require(rootPrefix + '/lib/globalConstant/contractName');

// Declare constants.
const nameToAbiMap = {};

/**
 * Function to parse file.
 *
 * @param {string} filePath
 * @param {object} options
 *
 * @returns {any}
 */
function parseFile(filePath, options) {
  filePath = path.join(__dirname, '/' + filePath);
  const fileContent = fs.readFileSync(filePath, options || 'utf8');

  return JSON.parse(fileContent);
}

/**
 * Class for OpenST core contract ABIs.
 *
 * @class CoreAbis
 */
class CoreAbis {
  /**
   * Returns SimpleToken ABI.
   *
   * @return {object}
   */
  static get simpleToken() {
    if (nameToAbiMap.simpleToken) {
      return nameToAbiMap.simpleToken;
    }
    nameToAbiMap.simpleToken = parseFile(rootPrefix + '/contracts/abi/SimpleToken.abi', 'utf8');

    return nameToAbiMap.simpleToken;
  }

  /**
   * Returns genericERC20 ABI.
   *
   * @return {*}
   */
  static get genericErc20() {
    if (nameToAbiMap.genericErc20) {
      return nameToAbiMap.genericErc20;
    }
    nameToAbiMap.genericErc20 = parseFile(rootPrefix + '/contracts/abi/GenericERC20.abi', 'utf8');

    return nameToAbiMap.genericErc20;
  }

  /**
   * Returns usdc ABI.
   *
   * @return {*}
   */
  static get usdc() {
    if (nameToAbiMap.usdc) {
      return nameToAbiMap.usdc;
    }
    nameToAbiMap.usdc = parseFile(rootPrefix + '/contracts/abi/USDC.abi', 'utf8');

    return nameToAbiMap.usdc;
  }

  /**
   * Get ABI.
   *
   * @param {string} contractName
   *
   * @returns {string}
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
      default:
        console.log(`ABI for contract name ${contractName} does not exist.`);
    }
  }
}

module.exports = CoreAbis;
