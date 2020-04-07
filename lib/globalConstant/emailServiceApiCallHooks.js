const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.
let eventTypes, invertedEventTypes, receiverEntityKinds, invertedReceiverEntityKinds;

/**
 * Class for email service API call hooks constants.
 *
 * @class EmailServiceApiCallHooks
 */
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

  get clientAllSuperAdminsReceiverEntityKind() {
    return 'clientAllSuperAdmins';
  }

  get receiverEntityIdForOstSupport() {
    return 0;
  }

  /**
   * Get event types.
   *
   * @returns {{"1": string, "2": string, "3": string}|*}
   */
  get getEventTypes() {
    const oThis = this;

    eventTypes = eventTypes || {
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

    invertedEventTypes = invertedEventTypes || util.invert(oThis.getEventTypes);

    return invertedEventTypes;
  }

  /**
   * Get receiver entity kinds.
   *
   * @returns {{"1": string, "2": string, "3": string, "7": string}|*}
   */
  get getReceiverEntityKinds() {
    const oThis = this;

    receiverEntityKinds = receiverEntityKinds || {
      '1': oThis.clientReceiverEntityKind,
      '2': oThis.managerReceiverEntityKind,
      '3': oThis.supportReceiverEntityKind,
      '7': oThis.clientAllSuperAdminsReceiverEntityKind
      // We have skipped 4,5,6 because they are used for different purposes in kit-api.
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

    invertedReceiverEntityKinds = invertedReceiverEntityKinds || util.invert(oThis.getReceiverEntityKinds);

    return invertedReceiverEntityKinds;
  }
}

module.exports = new EmailServiceApiCallHooks();
