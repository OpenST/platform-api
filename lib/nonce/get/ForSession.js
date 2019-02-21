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
  apiVersions = require(rootPrefix + '/lib/globalConstant/apiVersions');

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
   * cache key
   *
   * @return {string}
   */
  get cacheKey() {
    const oThis = this;

    let _cacheKey = `nonce_${oThis.chainKind}_${oThis.chainId}_${oThis.address}`;

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

    let _cacheLockKey = `nonce_${oThis.chainKind}_${oThis.chainId}_${oThis.address}_lock`;

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

    let ic = new InstanceComposer(oThis.configStrategy),
      TokenHolderNonce = ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenHolderNonce'),
      params = {
        auxChainId: oThis.chainId,
        tokenId: oThis.tokenId,
        userId: oThis.userId, // user uuid
        sessionAddress: oThis.address // session address
      },
      // TODO - go to all the GETHs
      currentTHNonceResponse = await new TokenHolderNonce(params).perform();

    // TODO - tx meta query??

    if (currentTHNonceResponse.isSuccess()) {
      const currentNonce = new BigNumber(currentTHNonceResponse.data.nonce);

      let setNonceResponse = await oThis.cacheImplementer.set(oThis.cacheKey, currentNonce.toNumber());

      if (setNonceResponse.isSuccess()) {
        return responseHelper.successWithData({ nonce: currentNonce.toNumber(), address: oThis.address });
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
