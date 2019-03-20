/**
 * Rabbitmq constants.
 *
 * @module lib/globalConstant/rabbitmq
 */

/**
 * Class for rabbitmq constants.
 *
 * @class Rabbitmq
 */
class Rabbitmq {
  // Kinds start.

  get originRabbitmqKind() {
    return 'originRabbitmq';
  }

  get auxRabbitmqKind() {
    return 'auxRabbitmq';
  }

  get globalRabbitmqKind() {
    return 'globalRabbitmq';
  }

  // Kinds end.
}

module.exports = new Rabbitmq();
