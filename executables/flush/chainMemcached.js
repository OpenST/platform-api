'use strict';

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  cacheManagementConst = require(rootPrefix + '/lib/globalConstant/cacheManagement'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/providers/clientSpecificCacheFactory');

let chainId = JSON.parse(process.argv[2]);

class FlushChainMemcached {
  constructor() {}

  async perform() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([chainId]),
      chainConfig = response[chainId];

    let instanceComposer = new InstanceComposer(chainConfig);

    let cacheObject = instanceComposer
      .getInstanceFor(coreConstants.icNameSpace, 'ClientSpecificCacheProvider')
      .getInstance(cacheManagementConst.memcached, '1');

    let cacheImplementer = cacheObject.cacheInstance;

    return cacheImplementer.delAll();
  }
}

let cacheflush = new FlushChainMemcached();

cacheflush.perform().then(function(r) {
  console.log('Flushed cache for chainId----------', chainId);
  process.exit(0);
});
