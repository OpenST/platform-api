'use strict';

const program = require('commander');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  AddSealerAddress = require(rootPrefix + '/lib/setup/auxChain/AddSealerAddress');

program
  .option('--auxChainId <auxChainId>', 'aux chain id')
  .option('--sealerAddress <sealerAddress>', 'sealer address')
  .option('--sealerPrivateKey <sealerPrivateKey>', 'sealer PrivateKey')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/setup/origin/saveSimpleTokenAddresses.js --auxChainId 2000 --sealerAddress 0xabc --sealerPrivateKey 0xabc'
  );
  logger.log('');
  logger.log('');
});

if (!program.auxChainId || !program.sealerAddress || !program.sealerPrivateKey) {
  program.help();
  process.exit(1);
}

new AddSealerAddress(program.auxChainId, program.sealerAddress, program.sealerPrivateKey)
  .perform()
  .then(function(response) {
    logger.log('response:', response);
    process.exit(0);
  });
