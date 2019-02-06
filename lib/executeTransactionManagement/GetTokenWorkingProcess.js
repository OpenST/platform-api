'use strict';

const rootPrefix = '../../..',
  TokenExtxWorkerProcessesModel = require(rootPrefix + '/app/models/mysql/TokenExtxWorkerProcesses'),
  TxCronProcessDetailsModel = require(rootPrefix + '/app/models/mysql/TxCronProcessDetails');

class GetTokenWorkingProcess {
  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
  }

  async perform() {
    const oThis = this,
      tokenWorkerProcessesMap = {},
      txCronProcessDetailsIds = [],
      cronDetails = [];
    let txCronProcessDetails;

    let tokenWorkerProcesses = await new TokenExtxWorkerProcessesModel()
      .select('*')
      .where(['token_id = ? AND tx_cron_process_detail_id IS NOT NULL', oThis.tokenId])
      .fire();

    for (let i = 0; i < tokenWorkerProcesses.length; i++) {
      let tokenWorkerProcess = tokenWorkerProcesses[i];

      txCronProcessDetailsIds.push(tokenWorkerProcess.tx_cron_process_detail_id);

      tokenWorkerProcessesMap[tokenWorkerProcess.tx_cron_process_detail_id] = tokenWorkerProcess;
    }

    if (txCronProcessDetailsIds.length > 0) {
      txCronProcessDetails = await new TxCronProcessDetailsModel()
        .select('*')
        .where(['id in (?)', txCronProcessDetailsIds])
        .fire();
    }

    for (let i = 0; i < txCronProcessDetails.length; i++) {
      let txCronProcessDetail = txCronProcessDetails[i],
        tokenWorkerProcess = tokenWorkerProcessesMap[txCronProcessDetail.id];

      cronDetails.push({
        cron_process_id: txCronProcessDetail.cron_process_id,
        chain_id: txCronProcessDetail.chain_id,
        queue_topic_suffix: txCronProcessDetail.queue_topic_suffix,
        token_address_id: tokenWorkerProcess.token_address_id,
        properties: tokenWorkerProcess.properties
      });
    }

    return cronDetails;
  }
}

module.exports = GetTokenWorkingProcess;
