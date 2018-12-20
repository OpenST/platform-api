'use strict';

/**
 * chain address constants
 *
 * @module lib/globalConstant/chainAddress
 */
const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.

const chainAddress = {
  // address kind enum types start
  deployerKind: 'deployer',
  // address kind enum types end

  // chain kind enum types start
  auxChainKind: 'aux',
  originChainKind: 'origin'
  // chain kind enum types end
};

chainAddress.kinds = {
  '1': chainAddress.deployerKind
};

chainAddress.invertedKinds = util.invert(chainAddress.kinds);

chainAddress.chainKinds = {
  '1': chainAddress.auxChainKind,
  '2': chainAddress.originChainKind
};

chainAddress.invertedKinds = util.invert(chainAddress.kinds);
chainAddress.invertedChainKinds = util.invert(chainAddress.chainKinds);

module.exports = chainAddress;
