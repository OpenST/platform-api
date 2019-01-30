'use strict';
/**
 * Shards model ddb constants.
 *
 * @module lib/globalConstant/shards.js
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.
const shards = {
  // Address kind enum types start
  user: 'user',
  device: 'device',
  recoveryAddress: 'recoveryAddress',
  session: 'session'
};

shards.entityKinds = {
  '1': shards.user,
  '2': shards.device,
  '3': shards.recoveryAddress,
  '4': shards.session
};

shards.invertedEntityKinds = util.invert(shards.entityKinds);

module.exports = shards;
