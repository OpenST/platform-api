'use strict';

const rootPrefix = '../..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  Fund = require(rootPrefix + '/lib/fund/eth/ByAddress'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  program = require('commander');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/fund/eth.js --cronProcessId 1');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

class FundEth extends CronBase {
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.canExit = true;
  }

  /**
   * _validateAndSanitize
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    if (!oThis.originChainId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_f_e_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { originChainId: oThis.originChainId }
        })
      );
    }

    if (!oThis.auxChainId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_f_e_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: { auxChainId: oThis.auxChainId }
        })
      );
    }
  }

  /**
   * _start
   * @private
   */
  async _start() {
    const oThis = this;

    let fund = new Fund({
      originChainId: oThis.originChainId,
      auxChainId: oThis.auxChainId,
      fromAddress: oThis.fromAddress
    });

    await fund.perform();
  }

  /**
   * cron kind
   *
   * @return {string}
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.fundEth;
  }

  /**
   * _pendingTasksDone
   *
   * @return {boolean}
   * @private
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }
}

logger.step('Eth funding process started.');

new FundEth({ cronProcessId: +program.cronProcessId }).perform();
