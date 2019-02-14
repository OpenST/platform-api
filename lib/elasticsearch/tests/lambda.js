const rootPrefix = '..',
  logger = require(rootPrefix + '/providers/logger'),
  lambda = require(rootPrefix + '/index'),
  config = require(rootPrefix + '/config/es.json');

let eventData = {
  Records: []
};

let records = eventData.Records;

let eventSourceARN =
  'arn:aws:dynamodb:us-east-1:704700004548:table/' +
  config.ddbTablePrefix +
  '_' +
  config.chainId +
  '_' +
  '_transactions' +
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
      txu: null,
      s: { N: '2' },
      cti: { N: '30018' },
      ca: { N: '1524147160000' },
      ts: { S: 'SKt' }
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
    newRecord.dynamodb.Keys.txu = txu;
    logger.log('idPostfix', idPostfix, 'txu', txu);
    newRecord.dynamodb.NewImage.txu = Object.assign({}, txu);
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
    newRecord.dynamodb.NewImage.ua = { N: String(Date.now()) };
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
