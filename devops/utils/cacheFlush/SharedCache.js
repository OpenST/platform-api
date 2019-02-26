'use strict';

const rootPrefix = '../../..',
  cache = require(rootPrefix + '/lib/providers/sharedMemcached'),
  FlushBase = require(rootPrefix + '/devops/utils/cacheFlush/Base.js');

/**
 * Class for Flushing shared cache
 *
 * @class
 */
class SharedCacheFlush extends FlushBase {
  /**
   * Constructor
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
    let cacheImplementer = cache.getInstance().cacheInstance;

    console.log('Flushing shared memcache... START');
    let response = await cacheImplementer.delAll();
    console.log('Flushing shared memcache... DONE');
    return response;
  }
}

module.exports = SharedCacheFlush;
