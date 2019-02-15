const rootPrefix = '..',
  logger = require(rootPrefix + '/providers/logger'),
  manifest = require(rootPrefix + '/manifest'),
  config = require(rootPrefix + '/config/es.json');

let id = 'txuuid',
  timeStamp = Date.now(),
  txuPrefix = 'create-6880-42e2-9ae1-6bbb2cb5b6a4-' + Date.now();

let buffer = {
  cts: { N: timeStamp },
  ti: { S: '1221' },
  txh: { S: '0xhsdhjhsdsds' },
  s: { N: 1 },
  m: { M: { n: { S: 'name' }, t: { S: 'type' }, d: { S: 'details' } } },
  tp: {
    M: {
      fa: { L: [{ S: '0x1' }, { S: '0x2' }] },
      ta: { L: [{ S: '0x3' }, { S: '0x4' }] }
    }
  }
};

let dataToInsert = [],
  currentTimestamp;

for (let i = 0; i < 10; i++) {
  currentTimestamp = Date.now();
  buffer = JSON.parse(JSON.stringify(buffer));
  buffer[id] = { S: txuPrefix + currentTimestamp + i };
  console.log("buffer['txu']", buffer[id]);
  dataToInsert.push(buffer);
}

const Service = manifest.services.transactions,
  service = new Service(config);

service
  .bulk('INSERT', dataToInsert)
  .then(function(response) {
    logger.debug('response', response.toHash());
  })
  .catch(function(reason) {
    logger.error('reason', reason);
  });
