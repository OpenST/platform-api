'use strict';

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let rabbitmqKinds, invertedRabbitmqKinds;

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

  get rabbitmqKinds() {
    const oThis = this;

    if (rabbitmqKinds) {
      return rabbitmqKinds;
    }

    rabbitmqKinds = {
      '1': oThis.originRabbitmqKind,
      '2': oThis.auxRabbitmqKind,
      '3': this.globalRabbitmqKind
    };

    return rabbitmqKinds;
  }

  get invertedRabbitmqKinds() {
    const oThis = this;

    if (invertedRabbitmqKinds) {
      return invertedRabbitmqKinds;
    }

    invertedRabbitmqKinds = util.invert(oThis.rabbitmqKinds);

    return invertedRabbitmqKinds;
  }

  // kinds end
}

module.exports = new Rabbitmq();
