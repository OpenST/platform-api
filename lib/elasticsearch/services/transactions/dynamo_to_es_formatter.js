'use strict';

const rootPrefix = '../..',
  Formatter = require(rootPrefix + '/helpers/Formatter'),
  dynamoHelpers = require(rootPrefix + '/helpers/dynamo_formatters');

const rules = [];
module.exports = new Formatter(rules);

//TODO schema to be decided

rules.push({ inKey: 'txu', outKey: 'id', formatter: dynamoHelpers.toNonEmptyString });

rules.push({ inKey: 'txh', outKey: 'transaction_hash', formatter: dynamoHelpers.toString });

rules.push({ inKey: 'fu', outKey: 'from_uuid', formatter: dynamoHelpers.toString });

rules.push({ inKey: 'tu', outKey: 'to_uuid', formatter: dynamoHelpers.toString });
