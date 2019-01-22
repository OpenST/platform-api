'use strict';

const signature = {
  verifySigner: {
    mandatory: [
      {
        parameter: 'signer',
        error_identifier: 'missing_signer'
      },
      {
        parameter: 'personal_sign',
        error_identifier: 'missing_personal_sign'
      },
      {
        parameter: 'message_to_sign',
        error_identifier: 'missing_message_to_sign'
      }
    ],
    optional: []
  },
  tokenDetailsAggregated: {
    mandatory: [
      {
        parameter: 'chain_id',
        error_identifier: 'missing_chain_id'
      },
      {
        parameter: 'contract_address',
        error_identifier: 'missing_contract_address'
      }
    ],
    optional: []
  },
  gatewayComposer: {
    mandatory: [
      {
        parameter: 'token_id',
        error_identifier: 'missing_token_id'
      },
      {
        parameter: 'staker_address',
        error_identifier: 'missing_staker_address'
      }
    ],
    optional: []
  }
};

module.exports = signature;
