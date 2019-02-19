'use strict';

/**
 * Module to fetch nonce of an address from specific contract.
 *
 * @module lib/nonce/contract/Base
 */

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');

require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Base class to fetch nonce of an address from specific contract
 *
 * @class
 */
class Base {
  /**
   * Constructor
   *
   * @param params {Object}
   * @param {Number} params.auxChainId - Aux chain Id
   * @param {Number} params.tokenId
   * @param {String} params.userId
   *
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.userId = params.userId;
    oThis.auxChainId = params.auxChainId;

    oThis.userData = null;
    oThis.contractObj = null;
    oThis.web3Instance = null;
  }

  async perform() {
    const oThis = this;

    await oThis._fetchUserDetails();

    await oThis._fetchWeb3Instance();

    oThis.contractObj = await oThis._initContract();

    if (!oThis.contractObj) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_n_c_b_3',
          api_error_identifier: 'resource_not_found',
          debug_options: {}
        })
      );
    }

    let nonce = await oThis._fetchNonceFromContract();

    return responseHelper.successWithData({ nonce: nonce });
  }

  async _fetchUserDetails() {
    const oThis = this;

    let TokenUSerDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUSerDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.userId] }),
      cacheFetchRsp = await tokenUserDetailsCacheObj.fetch();

    if (!CommonValidators.validateObject(cacheFetchRsp.data[oThis.userId])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'l_n_c_b_2',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['user_not_found'],
          debug_options: {}
        })
      );
    }

    oThis.userData = cacheFetchRsp.data[oThis.userId];
  }

  /**
   * Fetch Web3 Instance of aux chain
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.auxChainId]);

    let auxChainConfig = response[oThis.auxChainId],
      auxWsProviders = auxChainConfig.auxGeth.readWrite.wsProviders;

    oThis.web3Instance = web3Provider.getInstance(auxWsProviders[0]).web3WsProvider;
  }

  /**
   * Initialize Contract Obj
   *
   * @private
   */
  _initContract() {
    throw 'sub-class to implement';
  }

  /**
   * Fetch nonce from contract.
   *
   * @private
   */
  _fetchNonceFromContract() {
    throw 'sub-class to implement';
  }
}

module.exports = Base;
