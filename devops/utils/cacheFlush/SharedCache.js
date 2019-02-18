'use strict';


const rootPrefix = '../../..',
  cache = require(rootPrefix + '/lib/providers/sharedMemcached')
  ,FlushBase= require(rootPrefix + '/devops/utils/cacheFlush/Base.js')

;


/**
 * Class for Flushing shared cache
 *
 * @class
 */
class SharedCacheFlush extends FlushBase{
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
    let cacheImplementer = cache.getInstance().cacheInstance;
    console.log("Flushing shared memcache ::");

    let response = await cacheImplementer.delAll();
    return response;
  }


}

module.exports = SharedCacheFlush;

