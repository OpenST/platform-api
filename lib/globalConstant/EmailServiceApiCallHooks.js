/**
 * Constants for email service API call hooks table.
 *
 * @module lib/globalConstant/EmailServiceApiCallHooks
 */
const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

// Declare constants.

class EmailServiceApiCallHooks {
  // Event types starts here.
  get addContactEventType() {
    return 'addContactEvent';
  }

  get updateContactEventType() {
    return 'updateContactEvent';
  }

  get sendTransactionalEmailEventType() {
    return 'sendTransactionalEmailEvent';
  }

  get addContactEventType() {
    return 'addContactEvent';
  }
}

const currencies = {
    stPrime: 'stPrime',
    eth: 'eth'
  },
  kind = {
    '1': currencies.stPrime,
    '2': currencies.eth
  };

currencies.kinds = kind;
currencies.invertedKinds = util.invert(kind);

module.exports = EmailServiceApiCallHooks;
