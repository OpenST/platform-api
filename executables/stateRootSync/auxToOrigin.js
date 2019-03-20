/**
 * Cron to sync state root from origin to aux.
 *
 * @module executables/stateRootSync/OriginToAux
 */

const program = require('commander');

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  StateRootSyncBase = require(rootPrefix + '/executables/stateRootSync/Base'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/stateRootSync/auxToOrigin --cronProcessId 24');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

class StateRootSyncFromAuxToOrigin extends StateRootSyncBase {
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.sourceChainId = null;
    oThis.destinationChainId = null;
  }

  /**
   * Cron kind
   *
   * @return {String}
   *
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.auxToOriginStateRootSync;
  }

  /**
   *
   * @private
   */
  _setChainId() {
    const oThis = this;
    oThis.sourceChainId = oThis.auxChainId;
    oThis.destinationChainId = oThis.originChainId;
  }
}

new StateRootSyncFromAuxToOrigin({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, cronProcessesConstants.stateRootSyncCronsRestartInterval);
