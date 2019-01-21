'use strict';

/**
 *
 * @module lib/setup/economy/PostGatewayDeploy
 */

const rootPrefix = '../../..',
  StakerWhitelistedAddress = require(rootPrefix + '/app/models/mysql/StakerWhitelistedAddress'),
  stakerWhitelistedAddressConstants = require(rootPrefix + '/lib/globalConstant/StakerWhitelistedAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/sharedCacheManagement/TokenAddress'),
  InsertAddressIntoTokenAddress = require(rootPrefix + '/lib/setup/economy/InsertAddressIntoTokenAddress');

class PostGatewayComposerDeploy {
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

    oThis.stakerAddress = null;
    oThis.gatewayComposerContractAddress = null;
  }

  /**
   *  performer
   *
   * @returns {Promise<*>}
   */
  async perform() {
    const oThis = this;

    await oThis._fetchStakerAddress();

    let rsp = await oThis._insertGatewayAddress();

    await oThis._insertStakerWhitelistedAddress();

    return Promise.resolve(rsp);
  }

  /***
   *
   */
  async _fetchStakerAddress() {
    const oThis = this;

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    oThis.stakerAddress = getAddrRsp.data[tokenAddressConstants.ownerAddressKind];
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
      transactionHash: oThis.transactionHash
    });

    let rsp = await obj.perform();

    oThis.gatewayComposerContractAddress = rsp.data.taskResponseData.contractAddress;

    return rsp;
  }

  /***
   *
   * @private
   */
  async _insertStakerWhitelistedAddress() {
    const oThis = this;

    await new StakerWhitelistedAddress().insertAddress({
      tokenId: oThis.tokenId,
      status: new StakerWhitelistedAddress().invertedStatuses[stakerWhitelistedAddressConstants.activeStatus],
      stakerAddress: oThis.stakerAddress,
      gatewayComposerAddress: oThis.gatewayComposerContractAddress
    });
  }
}

module.exports = PostGatewayComposerDeploy;
