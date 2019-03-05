/**
 * Cron to fund stPrime by tokenAuxFunder.
 *
 * @module executables/funding/byTokenAuxFunder/toExTxWorkers
 */

const program = require('commander');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  FundExTxWorker = require(rootPrefix + '/lib/executeTransactionManagement/FundExTxWorker'),
  ByTokenAuxFunderBase = require(rootPrefix + '/executables/funding/byTokenAuxFunder/Base');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/funding/byTokenAuxFunder/toExTxWorkers --cronProcessId 21');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

class ByTokenAuxFunderBaseToExTxWorkers extends ByTokenAuxFunderBase {
  constructor(params) {
    super(params);
  }

  /**
   * Cron kind
   *
   * @return {String}
   *
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.fundByTokenAuxFunderToExTxWorkers;
  }

  /**
   * Fund Ex Tx worker for each tokenId.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _startTransfer(tokenIds) {
    const oThis = this;

    for (let i = 0; i < tokenIds.length; i++) {
      let tokenId = tokenIds[i];
      let fundExTxWorkerObject = new FundExTxWorker({
        tokenId: tokenId,
        chainId: oThis.auxChainId
      });

      let fundExTxWorkerResponse = await fundExTxWorkerObject.perform();

      logger.info('fundExTxWorkerResponse for ', tokenId, ' ', fundExTxWorkerResponse);
    }
  }
}

new ByTokenAuxFunderBaseToExTxWorkers({ cronProcessId: +program.cronProcessId })
  .perform()
  .then(function() {
    process.emit('SIGINT');
  })
  .catch(function() {
    process.emit('SIGINT');
  });
