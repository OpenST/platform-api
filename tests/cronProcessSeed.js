'use strict';

const rootPrefix = '..',
  addCronProcess = require(rootPrefix + '/lib/addCronProcess');

async function addCronProcessEntries() {
  await insertAuxBlockParser();

  await transactionAuxParser();

  await auxBlockFinalizer();

  await economyAggregator();

  await workflowWorker();

  await originBlockFinalizer();

  await insertBlockParser();

  await transactionOriginParser();

  await fundByMasterInternalFunderOriginChainSpecific();

  await fundByChainOwnerAuxChainSpecific();

  await fundBySealerAuxChainSpecific();

  await fundByTokenAuxFunderAuxChainSpecific();

  await updatePriceOraclePricePoints();

  await emailNotifier();

  await executeTransaction();

  process.exit(1);
}

async function insertAuxBlockParser() {
  console.log('creating insertAuxBlockParser');
  let cronParams = { intentionalBlockDelay: 0, chainId: 2000 },
    insertParams = {
      id: 1,
      kind: 'blockParser',
      ip_address: '127.0.0.1',
      chain_id: 2000,
      cron_params: cronParams,
      status: 'stopped'
    };
  return new addCronProcess(insertParams).perform().then(console.log);
}

async function transactionAuxParser() {
  console.log('creating transactionAuxParser');
  let cronParams = { prefetchCount: 1, chainId: 2000 },
    insertParams = {
      id: 2,
      kind: 'transactionParser',
      ip_address: '127.0.0.1',
      chain_id: 2000,
      cron_params: cronParams,
      status: 'stopped'
    };
  return new addCronProcess(insertParams).perform().then(console.log);
}

async function auxBlockFinalizer() {
  console.log('creating auxBlockFinalizer');
  let cronParams = { blockDelay: 24, chainId: 2000 },
    insertParams = {
      id: 3,
      kind: 'blockFinalizer',
      ip_address: '127.0.0.1',
      chain_id: 2000,
      cron_params: cronParams,
      status: 'stopped'
    };
  return new addCronProcess(insertParams).perform().then(console.log);
}

async function economyAggregator() {
  console.log('creating economyAggregator');
  let cronParams = { prefetchCount: 1, chainId: 2000 },
    insertParams = {
      id: 4,
      kind: 'economyAggregator',
      ip_address: '127.0.0.1',
      chain_id: 2000,
      cron_params: cronParams,
      status: 'stopped'
    };
  return new addCronProcess(insertParams).perform().then(console.log);
}

async function workflowWorker() {
  console.log('creating workflowWorker');
  let cronParams = { prefetchCount: 5 },
    insertParams = {
      id: 5,
      kind: 'workflowWorker',
      ip_address: '127.0.0.1',
      chain_id: 2000, // TODO - remove chain id
      cron_params: cronParams,
      status: 'stopped'
    };
  return new addCronProcess(insertParams).perform().then(console.log);
}

async function originBlockFinalizer() {
  console.log('creating originBlockFinalizer');
  let cronParams = { blockDelay: 24, chainId: 1000 },
    insertParams = {
      id: 6,
      kind: 'blockFinalizer',
      ip_address: '127.0.0.1',
      chain_id: 1000,
      cron_params: cronParams,
      status: 'stopped'
    };
  return new addCronProcess(insertParams).perform().then(console.log);
}

async function insertBlockParser() {
  console.log('creating insertBlockParser');
  let cronParams = { intentionalBlockDelay: 0, chainId: 1000 },
    insertParams = {
      id: 7,
      kind: 'blockParser',
      ip_address: '127.0.0.1',
      chain_id: 1000,
      cron_params: cronParams,
      status: 'stopped'
    };
  return new addCronProcess(insertParams).perform().then(console.log);
}

async function transactionOriginParser() {
  console.log('creating transactionOriginParser');
  let cronParams = { prefetchCount: 1, chainId: 1000 },
    insertParams = {
      id: 8,
      kind: 'transactionParser',
      ip_address: '127.0.0.1',
      chain_id: 1000,
      cron_params: cronParams,
      status: 'stopped'
    };
  return new addCronProcess(insertParams).perform().then(console.log);
}

async function fundByMasterInternalFunderOriginChainSpecific() {
  console.log('creating fundByMasterInternalFunderOriginChainSpecific');
  let cronParams = { originChainId: 1000 },
    insertParams = {
      id: 9,
      kind: 'fundByMasterInternalFunderOriginChainSpecific',
      ip_address: '127.0.0.1',
      chain_id: 1000,
      cron_params: cronParams,
      status: 'stopped'
    };
  return new addCronProcess(insertParams).perform().then(console.log);
}

async function fundByChainOwnerAuxChainSpecific() {
  console.log('creating fundByChainOwnerAuxChainSpecific');
  let cronParams = { originChainId: 1000, auxChainIds: [2000] },
    insertParams = {
      id: 10,
      kind: 'fundByChainOwnerAuxChainSpecific',
      ip_address: '127.0.0.1',
      chain_id: null,
      cron_params: cronParams,
      status: 'stopped'
    };
  return new addCronProcess(insertParams).perform().then(console.log);
}

async function fundBySealerAuxChainSpecific() {
  console.log('creating fundBySealerAuxChainSpecific');
  let cronParams = { originChainId: 1000 },
    insertParams = {
      id: 11,
      kind: 'fundBySealerAuxChainSpecific',
      ip_address: '127.0.0.1',
      chain_id: null,
      cron_params: cronParams,
      status: 'stopped'
    };
  return new addCronProcess(insertParams).perform().then(console.log);
}

async function fundByTokenAuxFunderAuxChainSpecific() {
  console.log('creating fundByTokenAuxFunderAuxChainSpecific');
  let cronParams = { originChainId: 1000 },
    insertParams = {
      id: 12,
      kind: 'fundByTokenAuxFunderAuxChainSpecific',
      ip_address: '127.0.0.1',
      chain_id: null,
      cron_params: cronParams,
      status: 'stopped'
    };
  return new addCronProcess(insertParams).perform().then(console.log);
}

async function updatePriceOraclePricePoints() {
  console.log('creating updatePriceOraclePricePoints');
  let cronParams = { auxChainId: 2000 },
    insertParams = {
      id: 13,
      kind: 'updatePriceOraclePricePoints',
      ip_address: '127.0.0.1',
      chain_id: 2000,
      cron_params: cronParams,
      status: 'stopped'
    };
  return new addCronProcess(insertParams).perform().then(console.log);
}

async function emailNotifier() {
  console.log('creating emailNotifier');
  let insertParams = {
    id: 14,
    kind: 'emailNotifier',
    ip_address: '127.0.0.1',
    chain_id: 2000,
    cron_params: {},
    status: 'stopped'
  };
  return new addCronProcess(insertParams).perform().then(console.log);
}

async function executeTransaction() {
  console.log('creating executeTransaction');
  let insertParams = {
    id: 15,
    kind: 'executeTransaction',
    ip_address: '127.0.0.1',
    chain_id: 2000,
    cron_params: {
      prefetchCount: 10
    },
    status: 'stopped',
    options: {
      queue_topic_suffix: 'asdsdfgf'
    }
  };
  return await new addCronProcess(insertParams).perform().then(console.log);
}

addCronProcessEntries();
