const rootPrefix = '..',
  logger = require(rootPrefix + '/providers/logger'),
  manifest = require(rootPrefix + '/manifest'),
  config = require(rootPrefix + '/config/es.json');

let txu = 'unique-6880-42e2-9ae1-6bbb2cb5b6a4-' + Date.now();

const Service = manifest.services.transactions,
  service = new Service(config);

let record = {
  txu: { S: txu },
  tt: { N: '1' },
  tu: { S: '26e270c1-8cc8-4997-812a-7c4a8891df85' },
  caiw: { N: '9713263332294277' },
  txh: { S: '0x8af22667c49af17f1cb23999515704cdb9f0a746edd1a48eba841c75d41c5b03' },
  ci: { N: '1018' },
  ai: { N: '20088' },
  gp: { N: '5000000000' },
  bn: { N: '1168726' },
  ua: { N: '1524147164000' },
  aiw: { N: '971326333229427764' },
  gu: { N: '105208' },
  fu: { S: 'd11f5169-0902-4857-80c8-f3ea5cd729b3' },
  s: { N: '2' },
  cti: { N: '30018' },
  ca: { N: '1524147160000' },
  ts: { S: 'SKt' }
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
