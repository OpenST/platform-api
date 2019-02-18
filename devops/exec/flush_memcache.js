'use strict';
const rootPrefix = '../..';
const chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  command = require('commander'),
  shell = require('shelljs');

command
  .version('0.1.0')
  .usage('[options]')
  .option('-s, --sub-env <required>', 'Sub environment')
  .option('-e, --env <required>', 'Environment ')
  .parse(process.argv);
const handleError = function() {
  command.outputHelp();
  throw 'Required parameters are missing!';
};

var Flush_Cache = async function() {
  const oThis = this;

  let originChainId = 3;
  if (command.env === 'production' && command.subEnv === 'main') {
    originChainId = 1;
  }
  let chainIds = await chainConfigProvider.allChainIds();
  let auxChainIds = chainIds.filter((chainId) => chainId !== originChainId);
  // Flush memcache one by one for all the chains
  for (let i = 0; i < auxChainIds.length; i++) {
    if (shell.exec(`node ./executables/flush/chainMemcached.js  ${auxChainIds[i]}`).code !== 0) {
      console.log('chain memcache flush failed for chainID::::', auxChainIds[i]);
      process.exit(1);
    }
  }

  //Flush shared memcache

  if (shell.exec('node ./executables/flush/sharedMemcached.js').code !== 0) {
    console.log('shared memcache flush failed');
    process.exit(1);
  }
};

Flush_Cache()
  .then(function() {
    process.exit(0);
  })
  .catch(function(err) {
    console.log(err);
    process.exit(1);
  });
