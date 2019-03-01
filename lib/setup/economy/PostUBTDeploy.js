'use strict';
/**
 * Flush balance shard cache
 *
 * @module lib/setup/economy/PostUBTDeploy
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object');

require(rootPrefix + '/lib/cacheManagement/chainMulti/BalanceShard');

/**
 * Class for flushing balance shard cache after UBT deploy
 *
 * @class
 */

class PostUBTDeploy {
  /**
   * Constructor for Token Rule deployment
   *
   * @param {Object} params
   * @param {String} params.auxChainId: auxChainId for which token rules needs be deployed.
   * @param {String} params.tokenId: tokenId for which token rules needs be deployed.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params['auxChainId'];
    oThis.tokenId = params['tokenId'];

    oThis.configStrategyObj = null;
    oThis.utilityBrandedTokenAddr = null;
  }

  /**
   * Performer
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_s_e_fbsc_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: { error: error.toString() }
        });
      }
    });
  }

  /**
   * Async performer
   *
   * @private
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._initializeVars();

    await oThis._flushCache();

    return responseHelper.successWithData({});
  }

  /**
   * Initialize required variables.
   *
   * @private
   */
  async _initializeVars() {
    const oThis = this;

    oThis.chainKind = coreConstants.auxChainKind;
    oThis.gasPrice = contractConstants.auxChainGasPrice;
  }

  async _flushCache() {
    const oThis = this,
      BalanceShardCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceShardCache');

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    oThis.utilityBrandedTokenAddr = getAddrRsp.data[tokenAddressConstants.utilityBrandedTokenContract];

    let balanceShardCacheObj = new BalanceShardCache({
      erc20Addresses: [oThis.utilityBrandedTokenAddr],
      chainId: oThis.auxChainId
    });

    await balanceShardCacheObj.clear();
  }

  /***
   * Config strategy
   *
   * @return {Object}
   */
  get _configStrategy() {
    const oThis = this;

    return oThis.ic().configStrategy;
  }

  /**
   * Object of config strategy class
   *
   * @return {Object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);

    return oThis.configStrategyObj;
  }
}

InstanceComposer.registerAsShadowableClass(PostUBTDeploy, coreConstants.icNameSpace, 'PostUBTDeploy');

module.exports = {};
