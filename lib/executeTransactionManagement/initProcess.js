'use strict';

/**
 * Run this process when any execute_transaction subscriber comes up.
 *
 * @module lib/execute_transaction_management/init_process
 *
 */

const rootPrefix = '../..',
  TxCronProcessDetailsModel = require(rootPrefix + '/app/models/mysql/TxCronProcessDetails'),
  ClientWorkerManagedAddressIdModel = require(rootPrefix + '/app/models/client_worker_managed_address_id'),
  clientWorkerManagedAddressConst = require(rootPrefix + '/lib/global_constant/client_worker_managed_address_id');

/**
 * constructor
 *
 * @param {Object} params
 * @param {Integer} params.process_id - Process id that is going to start.
 *
 * @constructor
 */
class InitProcessKlass {
  constructor(params) {
    const oThis = this;
    oThis.processId = params.processId;

    oThis.shouldStartTxQueConsume = 1;
    oThis.processDetails = {};
  }

  /**
   * perform
   *
   * @return {Promise}
   */
  async perform() {
    const oThis = this;

    await oThis.getProcessDetails();

    await oThis.getHoldWorkers();

    // Check and decide process consumption.
    return Promise.resolve({
      processDetails: oThis.processDetails,
      shouldStartTxQueConsume: 1
    });
  }

  async getProcessDetails() {
    const oThis = this;
    let cronDetails = await new TxCronProcessDetailsModel()
      .select('*')
      .where(['cron_process_id = ?', oThis.processId])
      .fire();
    oThis.processDetails['chainId'] = cronDetails[0].chain_id;
    oThis.processDetails['queueTopicSuffix'] = cronDetails[0].queue_topic_suffix;
    return oThis.processDetails;
  }
  /**
   * Get all hold workers.
   *
   * @return {Promise}
   */
  async getHoldWorkers() {
    const oThis = this,
      getAllHoldWorkersResp = await new ClientWorkerManagedAddressIdModel()
        .select('*')
        .where({
          process_id: oThis.processId,
          status: await new ClientWorkerManagedAddressIdModel().invertedStatuses[
            clientWorkerManagedAddressConst.holdStatus
          ]
        })
        .fire();
    if (getAllHoldWorkersResp.length <= 0) {
      return Promise.resolve({});
    }

    let clientIds = [];
    for (let i = 0; i < getAllHoldWorkersResp.length; i++) {
      clientIds.push(getAllHoldWorkersResp[i].client_id);
    }
    let getAllBlockingWorkersResp = await new ClientWorkerManagedAddressIdModel()
      .select('*')
      .where(['client_id in (?)', clientIds])
      .where({
        status: await new ClientWorkerManagedAddressIdModel().invertedStatuses[
          clientWorkerManagedAddressConst.blockingStatus
        ]
      })
      .fire();

    if (getAllHoldWorkersResp.length > 0 && getAllBlockingWorkersResp.length > 0) {
      oThis.responseData.shouldStartTxQueConsume = 0;
    } else if (getAllHoldWorkersResp.length > 0) {
      let activeStatus = await new ClientWorkerManagedAddressIdModel().invertedStatuses[
        clientWorkerManagedAddressConst.activeStatus
      ];
      await new ClientWorkerManagedAddressIdModel()
        .update({ status: activeStatus })
        .where({
          process_id: oThis.processId,
          status: await new ClientWorkerManagedAddressIdModel().invertedStatuses[
            clientWorkerManagedAddressConst.holdStatus
          ]
        })
        .fire();
    }

    return Promise.resolve({});
  }
}

module.exports = InitProcessKlass;
