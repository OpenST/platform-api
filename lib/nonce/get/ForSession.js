'use strict';

/**
 *
 * Get session address nonce
 *
 * @module lib/nonce/get/ForSession
 */

const BigNumber = require('bignumber.js'),
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  GetNonceBase = require(rootPrefix + '/lib/nonce/get/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta');

const errorConfig = basicHelper.fetchErrorConfig(apiVersions.general);

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/nonce/contract/TokenHolder');

class NonceGetForSession extends GetNonceBase {
  /**
   * Constructor for balance shard number cache
   *
   * @param {Object} params - cache key generation & expiry related params
   * @param {Number} params.chainId - chain id
   * @param {String} params.address - address
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.userId = params.userId;
  }

  /**
   * cache clear
   * @return {Promise<*>}
   */
  async clear() {
    const oThis = this;
    await oThis._setCacheImplementer();
    return oThis.cacheImplementer.del(oThis.cacheKey);
  }

  /**
   * cache key
   *
   * @return {string}
   */
  get cacheKey() {
    const oThis = this;

    let _cacheKey = `session_nonce_${oThis.chainKind}_${oThis.chainId}_${oThis.address}`;

    logger.debug('NM :: GetNonceForSession :: cacheKey: ', _cacheKey);
    return _cacheKey;
  }

  /**
   * cache lock key
   *
   * @return {string}
   */
  get cacheLockKey() {
    const oThis = this;

    let _cacheLockKey = `session_nonce_${oThis.chainKind}_${oThis.chainId}_${oThis.address}_lock`;

    logger.debug('NM :: GetNonceForSession :: cacheLockKey: ', _cacheLockKey);
    return _cacheLockKey;
  }

  /**
   * get nonce from chain and set cache
   *
   * @return {Promise<*>}
   * @private
   */
  async _getNonceFromChainAndSetCache() {
    const oThis = this;

    // get nonce from tx meta table
    let txMetaSessionNonce = -1,
      getSessionNonceQueryRsp = await new TransactionMetaModel().getSessionNonce(oThis.chainId, oThis.address);

    if (getSessionNonceQueryRsp.isSuccess() && getSessionNonceQueryRsp.data.hasOwnProperty('nonce')) {
      txMetaSessionNonce = getSessionNonceQueryRsp.data.nonce;
    }

    const txMetaMaxNonce = new BigNumber(txMetaSessionNonce);

    // get nonce from chain
    let ic = new InstanceComposer(oThis.configStrategy),
      params = {
        auxChainId: oThis.chainId,
        tokenId: oThis.tokenId,
        userId: oThis.userId, // user uuid
        sessionAddress: oThis.address, // session address
        web3Providers: oThis.chainWsProviders
      },
      TokenHolderContractNonce = ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenHolderNonce'),
      // TODO - go to all the GETHs
      tokenHolderContractNonceRsp = await new TokenHolderContractNonce(params).perform();

    if (tokenHolderContractNonceRsp.isSuccess()) {
      const currentSubmittedNonce = new BigNumber(tokenHolderContractNonceRsp.data.nonce),
        contractNonce = currentSubmittedNonce.minus(1);

      // Final nonce will be max of nonce from chain and Tx meta table
      const maxNonceCount = BigNumber.max(contractNonce, txMetaMaxNonce).plus(1);

      let setNonceResponse = await oThis.cacheImplementer.set(oThis.cacheKey, maxNonceCount.toNumber());

      if (setNonceResponse.isSuccess()) {
        return responseHelper.successWithData({ nonce: maxNonceCount.toNumber(), address: oThis.address });
      }

      return responseHelper.error({
        internal_error_identifier: 'l_nm_syncNonce_fail_1',
        api_error_identifier: 'internal_server_error',
        debug_options: { msg: 'unable to set nonce in cache.' },
        error_config: errorConfig
      });
    } else {
      return responseHelper.error({
        internal_error_identifier: 'l_nm_syncNonce_fail_2',
        api_error_identifier: 'internal_server_error',
        debug_options: { msg: 'unable to fetch nonce from chain nodes.' },
        error_config: errorConfig
      });
    }
  }
}

module.exports = NonceGetForSession;
