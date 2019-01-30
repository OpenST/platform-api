'use strict';
/**
 * Shards model ddb constants.
 *
 * @module lib/globalConstant/shards.js
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.
const entity = {
  // Entity kind enum types start
  user: 'user',
  device: 'device',
  recoveryAddress: 'recoveryAddress',
  session: 'session'
};

entity.entityKinds = {
  '1': shards.user,
  '2': shards.device,
  '3': shards.recoveryAddress,
  '4': shards.session
};

shards.invertedEntityKinds = util.invert(entity.entityKinds);

module.exports = entity;
