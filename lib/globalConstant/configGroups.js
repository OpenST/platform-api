'use strict';

class configGroupsConstants {
  constructor() {}

  get notAvailableForAllocation() {
    return 'notAvailable';
  }

  get availableForAllocation() {
    return 'available';
  }
}

module.exports = new configGroupsConstants();
