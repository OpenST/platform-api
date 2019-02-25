'use strict';

const rootPrefix = '../..',
  TokenExtxWorkerProcessesModel = require(rootPrefix + '/app/models/mysql/TokenExtxWorkerProcesses'),
  TxCronProcessDetailsModel = require(rootPrefix + '//app/models/mysql/TxCronProcessDetail');

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
        cronProcessId: txCronProcessDetail.cron_process_id,
        chainId: txCronProcessDetail.chain_id,
        queueTopicSuffix: txCronProcessDetail.queue_topic_suffix,
        tokenAddressId: tokenWorkerProcess.token_address_id,
        properties: tokenWorkerProcess.properties
      });
    }

    return { [oThis.tokenId]: cronDetails };
  }
}

module.exports = GetTokenWorkingProcess;
