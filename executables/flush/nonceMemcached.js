'use strict';

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/providers/nonceMemcached');

let chainId = JSON.parse(process.argv[2]);

class FlushNonceMemcached {
  constructor() {}

  async perform() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([chainId]),
      chainConfig = response[chainId];

    let instanceComposer = new InstanceComposer(chainConfig);

    let cacheObject = instanceComposer.getInstanceFor(coreConstants.icNameSpace, 'nonceCacheProvider').getInstance('1');

    let cacheImplementer = cacheObject.cacheInstance;

    return cacheImplementer.delAll();
  }
}

let cacheflush = new FlushNonceMemcached();

cacheflush.perform().then(function(r) {
  console.log('Flushed nonce memcache for chainId----------', chainId);
  process.exit(0);
});
