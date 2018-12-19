'use strict';

/**
 * known address constants
 *
 * @module lib/globalConstant/knownAddress
 */
const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.

const knownAddress = {
    // address type enum types start
    internalAddressType: 'internal',
    // address type enum types end

    // Status enum types start
    activeStatus: 'active',
    inactiveStatus: 'inactive'
    //Status enum types end
  },
  addressType = {
    '1': knownAddress.internalAddressType
  },
  status = {
    '1': knownAddress.runningStatus,
    '2': knownAddress.inactiveStatus
  };

knownAddress.addressTypes = addressType;
knownAddress.statuses = status;
knownAddress.invertedAddressTypes = util.invert(addressType);
knownAddress.invertedStatuses = util.invert(status);

module.exports = knownAddress;
