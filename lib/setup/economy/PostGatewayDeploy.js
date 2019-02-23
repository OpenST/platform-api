'use strict';

/**
 *
 * @module lib/setup/economy/PostGatewayDeploy
 */

const MosaicJs = require('@openstfoundation/mosaic.js'),
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  InsertAddressIntoTokenAddress = require(rootPrefix + '/lib/setup/economy/InsertAddressIntoTokenAddress');

class PostGatewayDeploy {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Integer} params.tokenId - id in tokens table
   * @param {String} params.kind - address kind
   * @param {Integer} params.chainId - chainId
   * @param {String} params.transactionHash - transactionHash
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.kind = params.kind;
    oThis.chainId = params.chainId;
    oThis.transactionHash = params.transactionHash;

    oThis.configStrategyObj = null;
    oThis.web3InstanceObj = null;
    oThis.gatewayContractAddress = null;
  }

  /**
   *  performer
   *
   * @returns {Promise<*>}
   */
  async perform() {
    const oThis = this;

    let rsp = await oThis._insertGatewayAddress();

    await oThis._insertStakeVaultAddress();

    return rsp;
  }

  /***
   *
   * @private
   */
  async _insertGatewayAddress() {
    const oThis = this;

    let obj = new InsertAddressIntoTokenAddress({
      chainId: oThis.chainId,
      tokenId: oThis.tokenId,
      kind: oThis.kind,
      chainKind: coreConstants.originChainKind,
      transactionHash: oThis.transactionHash
    });

    let rsp = await obj.perform();

    oThis.gatewayContractAddress = rsp.data.taskResponseData.contractAddress;

    return rsp;
  }

  /***
   *
   * @private
   */
  async _insertStakeVaultAddress() {
    const oThis = this;

    let stakeVaultAddress = await oThis._getStakeVault();

    let tokenAddressObj = new TokenAddressModel(),
      deployedChainKindInt = tokenAddressObj.invertedDeployedChainKinds[coreConstants.originChainKind];

    await tokenAddressObj.insertAddress({
      tokenId: oThis.tokenId,
      kind: tokenAddressObj.invertedKinds[tokenAddressConstants.simpleStakeContract],
      address: stakeVaultAddress,
      deployedChainId: oThis.chainId,
      deployedChainKind: deployedChainKindInt
    });
  }

  /**
   * Returns simpleStakeContractAddress.
   *
   * @return {Promise<*|result>}
   */
  async _getStakeVault() {
    const oThis = this,
      helperObj = new PostGatewayDeploy.GatewayHelper(oThis._web3Instance);
    return helperObj.getStakeVault(oThis.gatewayContractAddress, oThis._web3Instance);
  }

  /***
   *
   * get web3instance to interact with chain
   *
   * @return {Object}
   */
  get _web3Instance() {
    const oThis = this;
    if (oThis.web3InstanceObj) return oThis.web3InstanceObj;
    let chainEndpoint = oThis._configStrategyObject.chainWsProvider(oThis.chainId, 'readWrite');
    oThis.web3InstanceObj = web3Provider.getInstance(chainEndpoint).web3WsProvider;
    return oThis.web3InstanceObj;
  }

  /***
   *
   * config strategy
   *
   * @return {object}
   */
  get _configStrategy() {
    const oThis = this;
    return oThis.ic().configStrategy;
  }

  /***
   *
   * object of config strategy klass
   *
   * @return {object}
   */
  get _configStrategyObject() {
    const oThis = this;
    if (oThis.configStrategyObj) return oThis.configStrategyObj;
    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);
    return oThis.configStrategyObj;
  }

  static get GatewayHelper() {
    return MosaicJs.ChainSetup.GatewayHelper;
  }
}

InstanceComposer.registerAsShadowableClass(PostGatewayDeploy, coreConstants.icNameSpace, 'PostGatewayDeploy');

module.exports = PostGatewayDeploy;
