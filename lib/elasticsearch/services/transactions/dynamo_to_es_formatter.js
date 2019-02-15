'use strict';

const rootPrefix = '../..',
  logger = require(rootPrefix + '/providers/logger'),
  Formatter = require(rootPrefix + '/helpers/Formatter'),
  dynamoHelpers = require(rootPrefix + '/helpers/dynamo_formatters');

const rules = [];
const separator = '#';
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

rules.push({ inKey: 'cts', outKey: 'timestamp', formatter: dynamoHelpers.toValidNumber });

rules.push({ inKey: 'ti', outKey: 'token_id', formatter: dynamoHelpers.toValidNumber });

rules.push({ inKey: 'txh', outKey: 'transaction_hash', formatter: dynamoHelpers.toString });

rules.push({ inKey: 's', outKey: 'status', formatter: dynamoHelpers.toValidNumber });

rules.push({
  inKey: 'm',
  outKey: 'meta',
  formatter: function(inVal, inParams) {
    inVal = dynamoHelpers.val(inVal);

    if (Formatter.isNull(inVal)) {
      return null;
    }

    let nameKey = 'n',
      typeKey = 't',
      detailsKey = 'd',
      name = dynamoHelpers.toString(inVal[nameKey]),
      type = dynamoHelpers.toString(inVal[typeKey]),
      details = dynamoHelpers.toString(inVal[detailsKey]),
      assignerChar = '=',
      separator = '#',
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
  inKey: 'tp',
  outKey: 'from_user_address_status',
  formatter: function(inVal, inParams) {
    let fromAddressesString = getFromAddressesToString(inVal, inParams),
      status = dynamoHelpers.toValidNumber(inParams['s']),
      outVal = fromAddressesString + separator + status;
    logger.debug('Formatter from_user_addresses_status key data = ', outVal);

    return outVal;
  }
});

rules.push({
  inKey: 'tp',
  outKey: 'to_user_addresses_status',
  formatter: function(inVal, inParams) {
    let toAddressesString = getToAddressesToString(inVal, inParams),
      status = dynamoHelpers.toValidNumber(inParams['s']),
      outVal = null;

    if (toAddressesString) {
      outVal = toAddressesString + separator + status;
    }

    logger.debug('Formatter to_user_addresses_status key data = ', outVal);
    return outVal;
  }
});

rules.push({
  inKey: 'tp',
  outKey: 'user_addresses_status',
  formatter: function(inVal, inParams) {
    let fromAddressesString = getFromAddressesToString(inVal, inParams),
      toAddressesString = getToAddressesToString(inVal, inParams),
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

function getFromAddressesToString(inVal, inParams) {
  inVal = dynamoHelpers.val(inVal);

  if (Formatter.isNull(inVal)) {
    throw "'" + inVal + "' is not an Object.";
  }

  inVal = Formatter.toJSON(inVal);

  let formAddressKey = 'fa',
    formAddresses = dynamoHelpers.val(inVal[formAddressKey]);

  if (!(formAddresses instanceof Array)) {
    throw "'" + formAddresses + "' is not an Array.";
  }

  let ln = formAddresses.length,
    cnt,
    currVal,
    outVal = null;

  for (cnt = 0; cnt < ln; cnt++) {
    currVal = dynamoHelpers.toString(formAddresses[cnt]);
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
  inVal = dynamoHelpers.val(inVal);

  if (Formatter.isNull(inVal)) {
    return null;
  }

  inVal = Formatter.toJSON(inVal);

  let formAddressKey = 'ta',
    formAddresses = dynamoHelpers.val(inVal[formAddressKey]);

  if (!(formAddresses instanceof Array)) {
    return null;
  }

  let ln = formAddresses.length,
    cnt,
    currVal,
    outVal = null;

  for (cnt = 0; cnt < ln; cnt++) {
    currVal = dynamoHelpers.toString(formAddresses[cnt]);
    if (!outVal) {
      outVal = currVal;
    } else {
      outVal = outVal + separator + currVal;
    }
  }

  outVal = Formatter.toString(outVal);

  return outVal;
}
