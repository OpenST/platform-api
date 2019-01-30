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
  '1': entity.user,
  '2': entity.device,
  '3': entity.recoveryAddress,
  '4': entity.session
};

entity.invertedEntityKinds = util.invert(entity.entityKinds);

module.exports = entity;
