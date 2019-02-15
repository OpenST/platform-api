const rootPrefix = '..',
  logger = require(rootPrefix + '/providers/logger'),
  manifest = require(rootPrefix + '/manifest'),
  config = require(rootPrefix + '/config/es.json');

let timeStamp = Date.now(),
  txu = 'create-6880-42e2-9ae1-6bbb2cb5b6a4-' + timeStamp,
  record = {
    txuuid: { S: txu },
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

const Service = manifest.services.transactions,
  service = new Service(config);

function createRecord() {
  service
    .create(record)
    .then(function(response) {
      logger.win('create response', response.toHash());
      updateRecord();
    })
    .catch(function(reason) {
      logger.error('create reject reason', reason);
    });
}

function updateRecord() {
  service
    .update(record)
    .then(function(response) {
      logger.win('update response', response.toHash());
    })
    .catch(function(reason) {
      logger.error('update reject reason', reason);
    });
}

createRecord();
