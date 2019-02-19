#!/usr/bin/env node
'use strict';

const rootPrefix = '../..',
  command = require('commander')
  , FlushChainMemcache = require(rootPrefix + '/devops/utils/cacheFlush/ChainSpecificCache.js')
  , FlushSharedMemcache = require(rootPrefix + '/devops/utils/cacheFlush/SharedCache.js')
;

command
  .version('0.1.0')
  .usage('[options]')
  .option('-f, --flush-shared-memcache ', 'flush shared memcache ')
  .option('-s, --flush-chain-memcache ', 'flush chain memcache ')
  .parse(process.argv);


const Main = async function() {
  let performerObj = null;
  let resp=[];
  if (command.flushSharedMemcache) {
    performerObj = new FlushSharedMemcache();
     resp.push(await performerObj.perform()) ;
  }
  if (command.flushChainMemcache) {
    performerObj = new FlushChainMemcache();
    resp.push(await performerObj.perform()) ;

  }

  for (let i=0;i<resp.length;i++)
  {
    if(!(resp[i].success))
    {
      throw resp[i];
    }
  }

};

Main()
  .then(function() {
    console.error('flushed Cache  ');
    process.exit(0);
  })
  .catch(function(err) {
    console.error('error in flushing memcache ::error: ', err);
    process.exit(1);
  });
