'use strict';

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

class Rabbitmq {
  // kinds start

  get originRabbitmqKind() {
    return 'originRabbitmq';
  }

  get auxRabbitmqKind() {
    return 'auxRabbitmq';
  }

  get globalRabbitmqKind() {
    return 'globalRabbitmq';
  }

  // kinds end
}

module.exports = new Rabbitmq();
