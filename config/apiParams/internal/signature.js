'use strict';

const signature = {
  verifySigner: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'signer',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'personal_sign',
        validatorMethod: 'validatePersonalSign'
      },
      {
        parameter: 'message_to_sign',
        validatorMethod: 'validateString'
      }
    ],
    optional: []
  },
  gatewayComposer: {
    mandatory: [
      {
        parameter: 'token_id',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'staker_address',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'client_id',
        validatorMethod: 'validateInteger'
      }
    ],
    optional: []
  },
  tokenDeployment: {
    mandatory: [
      {
        parameter: 'token_id',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'client_id',
        validatorMethod: 'validateInteger'
      }
    ],
    optional: []
  },
  startMint: {
    mandatory: [
      {
        parameter: 'token_id',
        error_identifier: 'missing_chain_id'
      },
      {
        parameter: 'client_id',
        error_identifier: 'missing_client_id'
      },
      {
        parameter: 'approve_transaction_hash',
        error_identifier: 'missing_approve_transaction_hash'
      },
      {
        parameter: 'request_stake_transaction_hash',
        error_identifier: 'missing_request_stake_transaction_hash'
      }
    ],
    optional: []
  },
  mintDetails: {
    mandatory: [
      {
        parameter: 'client_id',
        error_identifier: 'missing_client_id'
      }
    ],
    optional: []
  }
};

module.exports = signature;
