/**
 * Constants for pepo campaigns.
 *
 * @module lib/globalConstant/pepoCampaigns
 */
const rootPrefix = '../..';

// Declare constants.

class pepoCampaigns {
  get recoveryRequestSubmissionTemplate() {
    return 'platform_recovery_request_submission';
  }
  get platformTokenSetupStatusSuccessTemplate() {
    return 'platform_token_setup_status_success';
  }
  get platformTokenSetupStatusFailedTemplate() {
    return 'platform_token_setup_status_failed';
  }
  get platformStakeAndMintStatusSuccessTemplate() {
    return 'platform_stake_and_mint_status_success';
  }
  get platformStakeAndMintStatusFailedTemplate() {
    return 'platform_stake_and_mint_status_failed';
  }

  get tokenSetupAttribute() {
    return 'token_setup';
  }

  get stakeAndMintAttribute() {
    return 'stake_and_mint';
  }

  get tokenName() {
    return 'token_name';
  }

  get testnetViewLink() {
    return 'testnet_view_link';
  }

  get platformDashboardUrl() {
    return 'platform_dashboard_url';
  }

  get viewLink() {
    return 'view_link';
  }

  get attributeSet() {
    return 1;
  }

  get attributeUnset() {
    return 0;
  }
}

module.exports = new pepoCampaigns();
