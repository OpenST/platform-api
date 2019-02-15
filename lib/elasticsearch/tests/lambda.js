const rootPrefix = '..',
  logger = require(rootPrefix + '/providers/logger'),
  lambda = require(rootPrefix + '/index'),
  config = require(rootPrefix + '/config/es.json');

let eventData = {
  Records: []
};

let records = eventData.Records;

let id = 'txuuid',
  timeStamp = Date.now(),
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
      txuuid: { S: txuPrefix },
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
