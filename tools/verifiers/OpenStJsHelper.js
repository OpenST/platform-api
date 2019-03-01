'use strict';

const OpenSTJs = require('@openstfoundation/openst.js');

const rootPrefix = '../..',
  RuleModel = require(rootPrefix + '/app/models/mysql/Rule'),
  TokenRuleCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenRule');

class OpenSTJsVerifierHelper {
  /**
   * Constructor
   *
   * @param web3Instance
   */
  constructor(web3Instance) {
    const oThis = this;

    oThis.web3Instance = web3Instance;
  }

  /**
   * Validate Contract byte code
   *
   * @param contractAddress
   * @param contractName
   *
   * @return {Promise<boolean>}
   */
  async validateContract(contractAddress, contractName) {
    const oThis = this;

    let deployedCode = await oThis.web3Instance.eth.getCode(contractAddress),
      binCode = await oThis._getBIN(contractName);

    deployedCode = deployedCode.slice(2);

    let chainCode = deployedCode.slice(parseInt(deployedCode.length) - 100, parseInt(deployedCode.length));

    return binCode.indexOf(chainCode) !== -1;
  }

  /**
   * Get contract object for queries
   *
   * @param contractName
   * @param contractAddress
   * @return {Promise<oThis.web3Instance.eth.Contract>}
   */
  async getContractObj(contractName, contractAddress) {
    const oThis = this;

    let abiForContract = await oThis._getABI(contractName);

    return new oThis.web3Instance.eth.Contract(abiForContract, contractAddress);
  }

  /**
   * Get pricer rule contract address from table for given token id
   *
   * @param tokenId
   * @return {Promise<*>}
   */
  async getPricerRuleAddr(tokenId) {
    const oThis = this,
      fetchPricerRuleRsp = await RuleModel.getPricerRuleDetails();

    let tokenRuleCache = new TokenRuleCache({ tokenId: tokenId, ruleId: fetchPricerRuleRsp.data.id }),
      tokenRuleCacheRsp = await tokenRuleCache.fetch();

    if (tokenRuleCacheRsp.isFailure() || !tokenRuleCacheRsp.data) {
      return Promise.reject(tokenRuleCacheRsp);
    }

    return tokenRuleCacheRsp.data.address;
  }

  /**
   * Get abi for given contract name
   *
   * @param contractName
   * @return {Promise<void>}
   * @private
   */
  async _getABI(contractName) {
    const oThis = this;

    return new OpenSTJs.AbiBinProvider().getABI(contractName);
  }

  /**
   * Get given contract bin
   *
   * @param contractName
   * @return {Promise<void>}
   * @private
   */
  async _getBIN(contractName) {
    const oThis = this;

    return new OpenSTJs.AbiBinProvider().getBIN(contractName);
  }

  /**
   * ==========================================
   * Following methods return contract names for know contracts
   * ==========================================
   */

  get getTokenRulesContractName() {
    return 'TokenRules';
  }

  get getPricerRuleContractName() {
    return 'PricerRule';
  }

  get getTokenHolderContractName() {
    return 'TokenHolder';
  }

  get getGnosisSafeContractName() {
    return 'GnosisSafe';
  }

  get getUserWalletFactoryContractName() {
    return 'UserWalletFactory';
  }

  get getProxyFactoryContractName() {
    return 'ProxyFactory';
  }
}

module.exports = OpenSTJsVerifierHelper;
