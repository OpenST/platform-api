const rootPrefix = '..',
  logger = require(rootPrefix + '/providers/logger'),
  manifest = require(rootPrefix + '/manifest'),
  config = require(rootPrefix + '/config/es.json');

let timeStamp = parseInt(Date.now() / 1000),
  txu = 'unique-6880-42e2-9ae1-6bbb2cb5b6a4-' + timeStamp;

const Service = manifest.services.transactions,
  service = new Service(config);

let record = {
  txuuid: {
    S: txu
  },
  cts: {
    N: timeStamp
  },
  ti: {
    N: '232'
  },
  val: {
    N: '0'
  },
  mp: {
    S: '{"n":"transaction_name","t":"user_to_user","d":"dsdsds"}'
  },
  gl: {
    N: '150000'
  },
  gp: {
    N: '1000000000'
  },
  rid: {
    N: '1'
  },
  es: {
    S:
      '{"r":"0x8742871e7b16d34aadb46131a0a38fed57da8d86365066fb36dc489ef33d9d76","s":"0x623989e049442b38bed5704aad0d1f1033ecad8681e504ebaa565a0efae5fde6","v":"0x1c"}'
  },
  ud: {
    S:
      '[{"era":"0xe88d8cd043c4eae8b30164d35a95bcd8358ee596","tha":"0x4e13fc4e514ea40cb3783cfaa4d876d49034aa18","bud":"10"}]'
  },
  ar: {
    S: '"{}"'
  },
  ted: {
    S:
      '0x94ac7a3f000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000a1c09ec51d6505eaea4a17d7810af1dcf5924aa60000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000a'
  },
  trs: {
    S:
      '[{"fa":"0x4e13fc4e514ea40cb3783cfaa4d876d49034aa99","ta":"0xA1C09EC51D6505EAeA4A17D7810aF1DcF5924A99","v":"10"},{"fa":"0x131231e13fc4e514ea40cb3783cfaa4d876d49034aa99","ta":"0x33533531C09EC51D6505EAeA4A17D7810aF1DcF5924A99","v":"10"}]'
  },
  uts: {
    N: '1550672891'
  },
  tad: {
    S: '0x4e13fc4e514ea40cb3783cfaa4d876d49034aa18'
  },
  cid: {
    N: '2000'
  },
  txh: {
    S: '0x623989e049442b38bed5704aad0d1f1033ecad8681e504ebaa565a0efae5fde6'
  },
  s: {
    N: 0
  }
};

function createRecord() {
  service
    .create(record)
    .then(function(response) {
      logger.win('create response', response.toHash());
      setTimeout(function() {
        searchRecords(query);
      }, 1000);
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

var query = {
  query: {
    query_string: {
      fields: ['user_addresses_status', 'meta'],
      query:
        '( f-0x4e13fc4e514ea40cb3783cfaa4d876d49034aa18 OR t-0x33533531C09EC51D6505EAeA4A17D7810aF1DcF5924A99 ) AND ( n=transaction_name AND t=user_to_user ) AND ( 0 OR 1 )'
    }
  }
};

searchRecords(query);

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

//createRecord();
