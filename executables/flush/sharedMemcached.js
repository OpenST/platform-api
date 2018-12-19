'use strict';

/*
 *
 * Utility to flush shared memcached
 *
 * Usage: node ./executables/flush/sharedMemcached.js
 *
 */

const rootPrefix = '../..',
  cache = require(rootPrefix + '/lib/providers/sharedMemcached');

let cacheImplementer = cache.getInstance().cacheInstance;

cacheImplementer.delAll().then(function() {
  console.log('--------Flushed memcached--------');
  process.exit(0);
});
