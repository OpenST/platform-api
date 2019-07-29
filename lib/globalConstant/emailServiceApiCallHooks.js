/**
 * Constants for email service API call hooks table.
 *
 * @module lib/globalConstant/emailServiceApiCallHooks
 */
const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.
let eventTypes, invertedEventTypes, receiverEntityKinds, invertedReceiverEntityKinds;

class EmailServiceApiCallHooks {
  get addContactEventType() {
    return 'addContactEvent';
  }

  get updateContactEventType() {
    return 'updateContactEvent';
  }

  get sendTransactionalEmailEventType() {
    return 'sendTransactionalEmailEvent';
  }

  get clientMileStoneEventType() {
    return 'clientMileStone';
  }

  get clientReceiverEntityKind() {
    return 'client';
  }

  get managerReceiverEntityKind() {
    return 'manager';
  }

  get supportReceiverEntityKind() {
    return 'support';
  }

  get receiverEntityIdForOstSupport() {
    return 0;
  }

  /**
   * Get event types.
   * @returns {{"1": string, "2": string, "3": string}|*}
   */
  get getEventTypes() {
    const oThis = this;

    if (eventTypes) {
      return eventTypes;
    }

    eventTypes = {
      '1': oThis.addContactEventType,
      '2': oThis.updateContactEventType,
      '3': oThis.sendTransactionalEmailEventType,
      '4': oThis.clientMileStoneEventType
    };

    return eventTypes;
  }

  /**
   * Inverted event types.
   *
   * @returns {*}
   */
  get getInvertedEventTypes() {
    const oThis = this;

    if (invertedEventTypes) {
      return invertedEventTypes;
    }

    return util.invert(oThis.getEventTypes);
  }

  /**
   * Get receiver entity kinds.
   * @returns {{"1": string, "2": string, "3": string}|*}
   */
  get getReceiverEntityKinds() {
    const oThis = this;

    if (receiverEntityKinds) {
      return receiverEntityKinds;
    }

    receiverEntityKinds = {
      '1': oThis.clientReceiverEntityKind,
      '2': oThis.managerReceiverEntityKind,
      '3': oThis.supportReceiverEntityKind
    };

    return receiverEntityKinds;
  }

  /**
   * Inverted receiver entity kinds.
   *
   * @returns {*}
   */
  get getInvertedReceiverEntityKinds() {
    const oThis = this;

    if (invertedReceiverEntityKinds) {
      return invertedReceiverEntityKinds;
    }

    return util.invert(oThis.getReceiverEntityKinds);
  }
}

module.exports = new EmailServiceApiCallHooks();
