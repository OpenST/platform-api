'use strict';

/**
 * Terminate execute transaction process.
 *
 * @module lib/executeTransactionManagement/TerminateExecuteTransactionProcess
 */
const OSTBase = require('@ostdotcom/base');

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyHelperByChainId = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  CronProcessesModel = require(rootPrefix + '/app/models/mysql/CronProcesses'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  TxCronProcessDetailsModel = require(rootPrefix + '/app/models/mysql/TxCronProcessDetail'),
  TokenExtxWorkerProcessesModel = require(rootPrefix + '/app/models/mysql/TokenExtxWorkerProcesses');

const args = process.argv,
  cronProcessId = +args[2];

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/executeTransactionManagement/DeAssociateWorker');

/**
 *
 * @class
 */
class TerminateExTxProcess {
  constructor() {
    const oThis = this;

    oThis.cronProcessDetailsId = null;
    oThis.chainId = null;
  }

  /**
   * Main performer method.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    let txCronProcessDetailsResp = await new TxCronProcessDetailsModel()
      .select('*')
      .where(['cron_process_id = ? ', cronProcessId])
      .fire();

    let txCronProcessDetails = txCronProcessDetailsResp[0];
    oThis.chainId = txCronProcessDetails.chain_id;

    let workerProcessDetails = await new TokenExtxWorkerProcessesModel()
      .select('id, token_id')
      .where(['tx_cron_process_detail_id = ?', txCronProcessDetails.id])
      .fire();

    // Creating ic
    await oThis._getConfig();

    let tokensAssociatedWithProcess = [],
      clientAllWorkersMap = {},
      cannotDisassociateClient = [],
      allTokenDetails = [];

    for (let index = 0; index < workerProcessDetails.length; index++) {
      tokensAssociatedWithProcess.push(workerProcessDetails[index].token_id);
    }

    if (tokensAssociatedWithProcess.length > 0) {
      allTokenDetails = await new TokenExtxWorkerProcessesModel()
        .select('*')
        .where(['token_id IN (?) AND tx_cron_process_detail_id IS NOT NULL', tokensAssociatedWithProcess])
        .fire();
    }

    for (let i = 0; i < allTokenDetails.length; i++) {
      let clientProcessWorker = allTokenDetails[i],
        pId = clientProcessWorker.tx_cron_process_detail_id;

      clientAllWorkersMap[clientProcessWorker.token_id] = clientAllWorkersMap[clientProcessWorker.token_id] || [];

      if (pId && pId != txCronProcessDetails.id) {
        clientAllWorkersMap[clientProcessWorker.token_id].push(pId);
      }
    }

    for (let i = 0; i < workerProcessDetails.length; i++) {
      let tokenId = workerProcessDetails[i].token_id;

      if (clientAllWorkersMap[tokenId].length > 0) {
        logger.step('Starting disassociation of token id : ' + tokenId);

        let DeAssociateWorker = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeAssociateWorker'),
          deAssociateWorkerObject = new DeAssociateWorker({ tokenId: tokenId, cronProcessIds: [cronProcessId] });

        await deAssociateWorkerObject.perform();
        await basicHelper.sleep(1000);
      } else {
        cannotDisassociateClient.push(tokenId);
      }
    }

    if (cannotDisassociateClient.length > 0) {
      logger.error(
        'Some of the clients cannot be disassociated as those clients do not have any other process associated with them. ' +
          'These clients are: ',
        cannotDisassociateClient
      );
      process.exit(0);
    } else {
      // mark process inactive.
      await new CronProcessesModel()
        .update({
          status: new CronProcessesModel().invertedStatuses[cronProcessesConstants.inactiveStatus]
        })
        .where({ id: cronProcessId })
        .fire();
    }

    process.exit(0);
  }

  /**
   * Get config strategy.
   *
   * @returns {Promise<*>}
   */
  async _getConfig() {
    const oThis = this;

    if (oThis.ic) return oThis.ic;

    let configStrategyHelperByChainIdObj = new ConfigStrategyHelperByChainId(oThis.chainId),
      config = await configStrategyHelperByChainIdObj.getComplete();

    let InstanceComposer = OSTBase.InstanceComposer;
    oThis.ic = new InstanceComposer(config.data);
  }
}

new TerminateExTxProcess().perform().then(console.log);
