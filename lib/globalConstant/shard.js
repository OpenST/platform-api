'use strict';
/**
 * Shards model ddb constants.
 *
 * @module lib/globalConstant/shard
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.
const entity = {
  // Entity kind enum types start
  userEntityKind: 'user',
  deviceEntityKind: 'device',
  recoveryAddressEntityKind: 'recoveryAddress',
  sessionEntityKind: 'session'
};

entity.entityKinds = {
  '1': entity.userEntityKind,
  '2': entity.deviceEntityKind,
  '3': entity.recoveryAddressEntityKind,
  '4': entity.sessionEntityKind
};

entity.invertedEntityKinds = util.invert(entity.entityKinds);

module.exports = entity;
