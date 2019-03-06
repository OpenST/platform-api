const rootPrefix = '..',
  logger = require(rootPrefix + '/providers/logger'),
  lambda = require(rootPrefix + '/index'),
  config = require(rootPrefix + '/config/es.json');

let eventData = {
  Records: []
};

let records = eventData.Records;

let id = 'txuuid',
  timeStamp = parseInt(Date.now() / 1000),
  txuPrefix = 'create-6880-42e2-9ae1-6bbb2cb5b6a4-' + Date.now();

let eventSourceARN =
  'arn:aws:dynamodb:us-east-1:704700004548:table/' +
  config.ddbTablePrefix +
  '_' +
  config.chainId +
  '_' +
  '_pending_transactions' +
  '/stream/2018-06-05T16:17:14.352';

let basicRecord = {
  eventID: 'e46fa89494f86fdab2e5306dbfcb9ddf',
  eventName: 'INSERT',
  eventVersion: '1.1',
  eventSource: 'aws:dynamodb',
  awsRegion: 'us-east-1',
  dynamodb: {
    ApproximateCreationDateTime: 1528216260,
    Keys: { txu: null },
    NewImage: {
      txuuid: {
        S: txuPrefix
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
    },
    SequenceNumber: '469000000000000613956122',
    SizeBytes: 875,
    StreamViewType: 'NEW_IMAGE'
  },
  eventSourceARN: eventSourceARN
};

let noOfRecords = 10;

let createRecords = function() {
  let cnt = noOfRecords;
  while (cnt--) {
    let newRecord = JSON.parse(JSON.stringify(basicRecord));
    let idPostfix = Date.now() + cnt;
    let txu = { S: 'ca1ffa7b-6880-42e2-9ae1-6bbb2cb5b6a4-' + idPostfix };
    newRecord.dynamodb.Keys[id] = txu;
    newRecord.dynamodb.NewImage[id] = Object.assign({}, txu);
    records.push(newRecord);
  }

  logger.step('createRecords payload:', eventData);
  lambda.handler(eventData, null, function(errResponse, successResponse) {
    if (errResponse) {
      logger.error(errResponse);
    }

    if (successResponse) {
      logger.win(successResponse);
    }
    updateRecords();
  });
};

let updateRecords = function() {
  let cnt = noOfRecords;
  while (cnt--) {
    let newRecord = records[cnt];
    newRecord.eventName = 'MODIFY';
  }

  lambda.handler(eventData, null, function(errResponse, successResponse) {
    if (errResponse) {
      logger.error(errResponse);
    }

    if (successResponse) {
      logger.win(successResponse);
    }
    deleteRecords();
  });
};

let deleteRecords = function() {
  let cnt = Math.floor(noOfRecords / 2);
  while (cnt--) {
    let newRecord = records[cnt];
    newRecord.eventName = 'REMOVE';
    newRecord.dynamodb.NewImage = {};
  }

  logger.step('deleteRecords payload:', eventData);
  lambda.handler(eventData, null, function(errResponse, successResponse) {
    if (errResponse) {
      logger.error(errResponse);
    }

    if (successResponse) {
      logger.win(successResponse);
    }
  });
};

createRecords();
