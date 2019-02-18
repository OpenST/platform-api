'use strict';
const rootPrefix = '../../..';
const chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  FlushBase = require(rootPrefix + '/devops/utils/cacheFlush/Base.js');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/providers/clientSpecificCacheFactory');

/**
 * Class for flushing chain specific memcache
 *
 * @class
 */
class ChainCacheFlush extends FlushBase {
  /**
   * Constructor
   *
   *
   * @constructor
   */
  constructor() {
    super();

    const oThis = this;
  }

  /**
   *
   *  _asyncPerform
   *
   * @return {Promise<result>}
   *
   */
  async _asyncPerform() {
    const oThis = this;

    let originChainId = oThis._fetchOriginChainId();

    let chainIds = await chainConfigProvider.allChainIds();
    let auxChainIds = chainIds.filter((chainId) => chainId !== originChainId);

    // Flush memcache one by one for all the chains

    let response = await chainConfigProvider.getFor(auxChainIds);
    let flushResponse;
    let errResponse = [];
    for (let i = 0; i < auxChainIds.length; i++) {
      try {
        let chainConfig = response[auxChainIds[i]];
        let instanceComposer = new InstanceComposer(chainConfig);
        let cacheObject = instanceComposer
          .getInstanceFor(coreConstants.icNameSpace, 'ClientSpecificCacheProvider')
          .getInstance(cacheManagementConst.memcached, '1');
        let cacheImplementer = cacheObject.cacheInstance;
        flushResponse = await cacheImplementer.delAll();
        console.log('Flushing cache for chainid ::', auxChainIds[i]);
      } catch (err) {
        errResponse.push(auxChainIds[i]);
        console.log('err is ./devops/utils/cacheFlush/ChainSpecificCache.js:   do_u_cf_cs_ap1::', err);
      }
    }
    if (errResponse.length > 0) {
      return { success: false, data: errResponse };
    }

    return { success: true };
  }

  /**
   *
   *  _fetchOriginChainId
   *
   * @return originChainId
   *
   */

  async _fetchOriginChainId() {
    const oThis = this,
      csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.constants),
      configConstants = csResponse.data[configStrategyConstants.constants];

    return configConstants.originChainId;
  }
}

module.exports = ChainCacheFlush;
