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
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'client_id',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'approve_transaction_hash',
        validatorMethod: 'validateTransactionHash'
      },
      {
        parameter: 'request_stake_transaction_hash',
        validatorMethod: 'validateTransactionHash'
      },
      {
        parameter: 'staker_address',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'fe_ost_to_stake',
        validatorMethod: 'validateString'
      },
      {
        parameter: 'fe_bt_to_mint',
        validatorMethod: 'validateString'
      }
    ],
    optional: []
  },

  mintDetails: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'total_gas_for_mint',
        validatorMethod: 'validateInteger'
      }
    ],
    optional: []
  },

  grantEthOst: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'address',
        validatorMethod: 'validateEthAddress'
      }
    ],
    optional: []
  }
};

module.exports = signature;
