'use strict';

let shortNameToLongNameMap;

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

class Balance {
  get longNameToShortNameMap() {
    return {
      tokenHolderAddress: 'tha',
      erc20Address: 'era',
      blockChainSettledBalance: 'bsb',
      blockChainUnsettleDebits: 'bud',
      creditSettledBalance: 'csb',
      creditUnSettledDebits: 'cud',
      pessimisticSettledBalance: 'psb',
      updatedTimestamp: 'uts'
    };
  }

  get shortNameToLongNameMap() {
    const oThis = this;
    if (shortNameToLongNameMap) return shortNameToLongNameMap;
    shortNameToLongNameMap = util.invert(oThis.longNameToShortNameMap);
    return shortNameToLongNameMap;
  }
}

module.exports = new Balance();
