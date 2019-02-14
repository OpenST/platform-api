'use strict';

/**
 * Terminate execute transaction process.
 *
 * @module lib/executeTransactionManagement/TerminateExecuteTransactionProcess
 */
const OSTBase = require('@openstfoundation/openst-base');

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyHelperByChainId = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  TxCronProcessDetailsModel = require(rootPrefix + '/app/models/mysql/TxCronProcessDetails'),
  TokenExtxWorkerProcessesModel = require(rootPrefix + '/app/models/mysql/TokenExtxWorkerProcesses');

const args = process.argv,
  processId = +args[2];

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/executeTransactionManagement/DeAssociateWorker');

/**
 *
 * @class
 */
class DeAssociateAll {
  constructor() {}

  /**
   * Main performer method.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this,
      workerProcessDetails = await new TokenExtxWorkerProcessesModel()
        .select('id, token_id')
        .where(['tx_cron_process_detail_id = ?', processId])
        .fire();

    // Creating ic
    await oThis._getConfig();

    let clientsAssociatedWithProcess = [],
      clientAllWorkersMap = {},
      cannotDisassociateClient = [];

    for (let index = 0; index < workerProcessDetails.length; index++) {
      clientsAssociatedWithProcess.push(workerProcessDetails[index].token_id);
    }

    let allTokenDetails = await new TokenExtxWorkerProcessesModel()
      .select('*')
      .where(['token_id IN (?)', clientsAssociatedWithProcess])
      .fire();

    for (let i = 0; i < allTokenDetails.length; i++) {
      let clientProcessWorker = allTokenDetails[i],
        pId = +clientProcessWorker.tx_cron_process_detail_id;

      clientAllWorkersMap[clientProcessWorker.token_id] = clientAllWorkersMap[clientProcessWorker.token_id] || [];

      if (pId && pId !== processId) {
        clientAllWorkersMap[clientProcessWorker.token_id].push(pId);
      }
    }

    for (let i = 0; i < workerProcessDetails.length; i++) {
      let tokenId = workerProcessDetails[i].token_id;

      if (clientAllWorkersMap[tokenId].length > 0) {
        logger.step('Starting disassociation of token id : ' + tokenId);

        let DeAssociateWorker = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeAssociateWorker'),
          deAssociateWorkerObject = new DeAssociateWorker({ tokenId: tokenId, processIds: [processId] });

        await deAssociateWorkerObject.perform();
        await basicHelper.pauseForMilliSeconds(1000);
      } else {
        cannotDisassociateClient.push(tokenId);
      }
    }

    if (cannotDisassociateClient.length > 0) {
      logger.step(
        'Some of the clients cannot be disassociated as those clients do not have any other process associated with them. ' +
          'These clients are: ',
        cannotDisassociateClient
      );
      process.exit(1);
    }

    process.exit(0);
  }

  /**
   * get chainId of current ProcessId.
   * @returns {Promise<void>}
   * @private
   */
  async _getChainId() {
    let chainIdResponse = await new TxCronProcessDetailsModel()
      .select('chain_id')
      .where(['id = ? ', processId])
      .fire();

    return chainIdResponse[0].chain_id;
  }

  /**
   * Get config strategy.
   *
   * @returns {Promise<*>}
   */
  async _getConfig() {
    const oThis = this;

    if (oThis.ic) return oThis.ic;

    let chainId = await oThis._getChainId();

    let configStrategyHelperByChainIdObj = new ConfigStrategyHelperByChainId(chainId),
      config = await configStrategyHelperByChainIdObj.getComplete();

    let InstanceComposer = OSTBase.InstanceComposer;
    oThis.ic = new InstanceComposer(config.data);
  }
}

new DeAssociateAll().perform().then(console.log);
