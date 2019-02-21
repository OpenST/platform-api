'use strict';

const rootPrefix = '../..',
  logger = require(rootPrefix + '/providers/logger'),
  Formatter = require(rootPrefix + '/helpers/Formatter'),
  dynamoHelpers = require(rootPrefix + '/helpers/dynamo_formatters');

const rules = [];
const formAddressKey = 'fa',
  toAddressKey = 'ta',
  fromPrefix = 'f-',
  toPrefix = 't-',
  separator = ' ';
module.exports = new Formatter(rules);

//  tx_uuid -  searchable   *
//  token_id = searchable   *
//
// transaction_hash - not searchable optional

// from_user_address-status Array  - searchable
// to_user_address-status Array  - searchable

// user_addresses-status - searchable *

// status - sort *
// timestamp  - sort *
// Meta - a=b|c=d|e=f

// {
//   "txuuid": { "S": "0fdfd-fdfdf-fdfdf-dfdf"},
//   "cts": { "N": 1234567890},
//   "ti": {"S": "1221"},
//   "txh": {"S": "0xhsdhjhsdsds"},
//   "s": {"N": 1},
//   "m": {"M": {"n": {"S": "name"},"t": {"S": "type"},"d": {"S": "details"}}},
//   "tp": {"M": {"fa": {"L": [{"S": "0x1"}, {"S": "0x2"}]},
//               "ta": {"L": [{"S": "0x3"}, {"S": "0x4"}]}}
//         }
// }

rules.push({ inKey: 'txuuid', outKey: 'id', formatter: dynamoHelpers.toNonEmptyString });

rules.push({ inKey: 'cts', outKey: 'created_at', formatter: dynamoHelpers.toValidNumber });

rules.push({ inKey: 'ti', outKey: 'token_id', formatter: dynamoHelpers.toValidNumber });

rules.push({ inKey: 'txh', outKey: 'transaction_hash', formatter: dynamoHelpers.toString });

rules.push({ inKey: 's', outKey: 'status', formatter: dynamoHelpers.toValidNumber });

rules.push({
  inKey: 'mp',
  outKey: 'meta',
  formatter: function(inVal, inParams) {
    inVal = dynamoHelpers.val(inVal);

    if (Formatter.isNull(inVal)) {
      return null;
    }

    inVal = Formatter.toJSON(inVal);

    let nameKey = 'n',
      typeKey = 't',
      detailsKey = 'd',
      name = Formatter.toString(inVal[nameKey]),
      type = Formatter.toString(inVal[typeKey]),
      details = Formatter.toString(inVal[detailsKey]),
      assignerChar = '=',
      outVal = '';

    if (name) {
      outVal = outVal + nameKey + assignerChar + name;
    }

    if (type) {
      outVal = outVal + separator + typeKey + assignerChar + type;
    }

    if (details) {
      outVal = outVal + separator + detailsKey + assignerChar + details;
    }

    outVal = Formatter.toString(outVal);
    logger.debug('Formatter meta key data = ', outVal);
    return outVal;
  }
});

rules.push({
  inKey: 'trs',
  outKey: 'from_user_address_status',
  formatter: function(inVal, inParams) {
    let formAndToAddress = getFromAndToAddress(inVal, inParams);
    let fromAddressesString = getFromAddressesToString(formAndToAddress, inParams),
      status = dynamoHelpers.toValidNumber(inParams['s']),
      outVal = fromAddressesString + separator + status;
    logger.debug('Formatter from_user_addresses_status key data = ', outVal);

    return outVal;
  }
});

rules.push({
  inKey: 'trs',
  outKey: 'to_user_addresses_status',
  formatter: function(inVal, inParams) {
    let formAndToAddress = getFromAndToAddress(inVal, inParams);
    let toAddressesString = getToAddressesToString(formAndToAddress, inParams),
      status = null,
      outVal = null;

    if (toAddressesString) {
      status = dynamoHelpers.toValidNumber(inParams['s']);
      outVal = toAddressesString + separator + status;
    }

    logger.debug('Formatter to_user_addresses_status key data = ', outVal);
    return outVal;
  }
});

rules.push({
  inKey: 'trs',
  outKey: 'user_addresses_status',
  formatter: function(inVal, inParams) {
    let formAndToAddress = getFromAndToAddress(inVal, inParams);

    let fromAddressesString = getFromAddressesToString(formAndToAddress, inParams),
      toAddressesString = getToAddressesToString(formAndToAddress, inParams),
      status = dynamoHelpers.toValidNumber(inParams['s']),
      outVal = null;

    outVal = fromAddressesString;

    if (toAddressesString) {
      outVal = outVal + separator + toAddressesString;
    }

    outVal = outVal + separator + status;
    logger.debug('Formatter user_addresses_status key data = ', outVal);
    return outVal;
  }
});

function getFromAndToAddress(inVal, inParams) {
  inVal = dynamoHelpers.val(inVal);

  if (Formatter.isNull(inVal)) {
    throw "'" + inVal + "' is not an Object.";
  }

  inVal = Formatter.toJSON(inVal);

  let ln = inVal.length;

  if (ln == 0) {
    throw "'" + inVal + "' is not an Array.";
  }

  let formAndToArrayMap = {},
    cnt,
    currFA,
    currTA,
    currVal;

  formAndToArrayMap[formAddressKey] = [];
  formAndToArrayMap[toAddressKey] = [];

  for (cnt = 0; cnt < ln; cnt++) {
    currVal = inVal[cnt];
    currVal = Formatter.toJSON(currVal);
    currFA = Formatter.toString(currVal[formAddressKey]);
    currTA = Formatter.toString(currVal[toAddressKey]);
    if (currFA) {
      formAndToArrayMap[formAddressKey].push(currFA);
    }

    if (currTA) {
      formAndToArrayMap[toAddressKey].push(currTA);
    }
  }

  return formAndToArrayMap;
}

function getFromAddressesToString(inVal, inParams) {
  if (!inVal || Formatter.isNull(inVal)) {
    throw "'" + inVal + "' is not an Object.";
  }

  let formAddresses = inVal[formAddressKey];

  if (!(formAddresses instanceof Array)) {
    throw "'" + formAddresses + "' is not an Array.";
  }

  let ln = formAddresses.length,
    cnt,
    currVal,
    outVal = null;

  for (cnt = 0; cnt < ln; cnt++) {
    currVal = Formatter.toString(formAddresses[cnt]);
    currVal = fromPrefix + currVal;
    if (!outVal) {
      outVal = currVal;
    } else {
      outVal = outVal + separator + currVal;
    }
  }

  outVal = Formatter.toNonEmptyString(outVal);

  return outVal;
}

function getToAddressesToString(inVal, inParams) {
  if (!inVal || Formatter.isNull(inVal)) {
    return null;
  }

  let toAddresses = inVal[toAddressKey];

  if (!(toAddresses instanceof Array)) {
    return null;
  }

  let ln = toAddresses.length,
    cnt,
    currVal,
    outVal = null;

  for (cnt = 0; cnt < ln; cnt++) {
    currVal = toAddresses[cnt];
    currVal = toPrefix + currVal;
    if (!outVal) {
      outVal = currVal;
    } else {
      outVal = outVal + separator + currVal;
    }
  }

  outVal = Formatter.toString(outVal);

  return outVal;
}
