const rootPrefix = '..',
  logger = require(rootPrefix + '/providers/logger'),
  manifest = require(rootPrefix + '/manifest'),
  config = require(rootPrefix + '/config/es.json');

let id = 'txuuid',
  timeStamp = parseInt(Date.now() / 1000),
  txuPrefix = 'create-6880-42e2-9ae1-6bbb2cb5b6a4-' + Date.now();

let buffer = {
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
      '[{"fa":"0x4e13fc4e514ea40cb3783cfaa4d876d49034aa18","ta":"0xA1C09EC51D6505EAeA4A17D7810aF1DcF5924Aa6","v":"10"}]'
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
    N: 1
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
