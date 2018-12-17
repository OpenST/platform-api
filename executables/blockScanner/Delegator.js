'use strict';
/**
 * This code acts as a master process to block scanner, which delegates the transactions from a block to block scanner worker processes
 *
 * Usage: node executables/block_scanner/transaction_delegator.js 1
 *
 * Command Line Parameters Description:
 * processLockId: used for ensuring that no other process with the same processLockId can run on a given machine.
 *
 * @module executables/blockScanner/blockScanner
 */

const fs = require('fs');

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/core_constants'),
  logger = require(rootPrefix + '/lib/logger/custom_console_logger'),
  SigIntHandler = require(rootPrefix + '/executables/sigint_handler'),
  CronProcessesHandler = require(rootPrefix + '/lib/cron_processes_handler'),
  CronProcessesConstants = require(rootPrefix + '/lib/global_constant/cron_processes'),
  CronProcessHandlerObject = new CronProcessesHandler();

const usageDemo = function() {
  logger.log('Usage:', 'node executables/blockScanner/blockScanner.js');
};

// Declare variables.
const args = process.argv,
  processLockId = args[2],
  cronKind = CronProcessesConstants.blockScanner;

let groupId,
  configStrategy = {};

class TransactionDelegator {
  
  constructor() {
  
  }
  
  async init() {
  
  }
  
}


// Check whether the cron can be started or not.
CronProcessHandlerObject.canStartProcess({
  id: +processLockId, // Implicit string to int conversion
  cron_kind: cronKind
}).then(function(dbResponse) {
  let cronParams, blockScannerMasterObj;

  try {
    cronParams = JSON.parse(dbResponse.data.params);
    groupId = cronParams.group_id;
    

    // We are creating the object before validation since we need to attach the methods of SigInt handler to the
    // prototype of this class.
    blockScannerMasterObj = new TransactionDelegator();

    // Validate if the dataFilePath exists in the DB or not. We are not validating benchmarkFilePath as it is an
    // optional parameter.
    if (!dataFilePath) {
      logger.error('Data file path NOT available in cron params in the database.');
      process.emit('SIGINT');
    }

    // Perform action if cron can be started.
    blockScannerMasterObj.init().then(function(r) {
      logger.win('Blockscanner Master Process Started');
    });
  } catch (err) {
    logger.error('Cron parameters stored in INVALID format in the DB.');
    logger.error(
      'The status of the cron was NOT changed to stopped. Please check the status before restarting the cron'
    );
    process.exit(1);
  }
});
