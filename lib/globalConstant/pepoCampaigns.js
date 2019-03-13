/**
 * Constants for email service API call hooks table.
 *
 * @module lib/globalConstant/pepoCampaigns
 */
const rootPrefix = '../..';

// Declare constants.

class pepoCampaigns {
  get initiateRecoveryMailTemplate() {
    return 'initiate_recovery_mail';
  }
}

module.exports = new pepoCampaigns();
