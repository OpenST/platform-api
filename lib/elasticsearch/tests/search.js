const rootPrefix = '..',
  logger = require(rootPrefix + '/providers/logger'),
  manifest = require(rootPrefix + '/manifest'),
  config = require(rootPrefix + '/config/es.json');

let timeStamp = Date.now(),
  txu = 'unique-6880-42e2-9ae1-6bbb2cb5b6a4-' + timeStamp;

const Service = manifest.services.transactions,
  service = new Service(config);

let record = {
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

function createRecord() {
  service
    .create(record)
    .then(function(response) {
      logger.win('create response', response.toHash());
      setTimeout(searchRecords, 10000);
    })
    .catch(function(reason) {
      logger.error('create reject reason', reason);
    });
}

/**
 * query - query for ES
 * Eg query : {
 *			"query": {
 *		  		"match": {
 *					"updated_at": ua
 *		 			 }
 *				}
 *	 		}
 * source - Fields to get from ES , default will get complete document.
 * Eg source : ["id", "from_uuid", ...];
 * */

function searchRecords(query, source) {
  query = query || {
    query: {
      terms: {
        _id: [txu]
      }
    }
  };
  logger.step('search query', query);
  return service
    .search(query, source)
    .then(function(response) {
      response = response.toHash();
      logger.win('search response', response);
    })
    .catch(function(reason) {
      logger.error('search reject reason', reason);
    });
}

createRecord();
