#!/usr/bin/env node
'use strict';

const rootPrefix = '../..',
  command = require('commander'),
  FlushChainMemcache = require(rootPrefix + '/devops/utils/cacheFlush/ChainSpecificCache.js'),
  FlushSharedMemcache = require(rootPrefix + '/devops/utils/cacheFlush/SharedCache.js');

command
  .version('0.1.0')
  .usage('[options]')
  .option('--flush-memcache', 'Flush memcache')
  .option('--flush-chain-memcache', 'Flush chain specific memcache')
  .parse(process.argv);

const handleError = function() {
  command.outputHelp();
  throw 'Required parameters are missing!';
};

const Main = async function() {
  let performerObj = null;
  let respArr = [];

  if (!command.flushMemcache && !command.flushChainMemcache) {
    handleError();
  }

  if (command.flushMemcache) {
    performerObj = new FlushSharedMemcache();
    respArr.push(await performerObj.perform());
  }

  if (command.flushChainMemcache) {
    performerObj = new FlushChainMemcache();
    respArr.push(await performerObj.perform());
  }

  for (let i = 0; i < respArr.length; i++) {
    let resp = respArr[i];
    if (resp.isFailure()) {
      throw resp;
    }
  }
};

Main()
  .then(function() {
    console.info('Cache flush Done!');
    process.exit(0);
  })
  .catch(function(err) {
    console.error('devops/exec/flushMemcache.js ::error: ', JSON.stringify(err));
    process.exit(1);
  });
