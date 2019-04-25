/**
 * Module to define signatures for internal route api parameters.
 *
 * @module config/apiParams/internal/signature
 */

// Declare variables.
const signature = {
  verifySigner: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
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
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'staker_address',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      }
    ],
    optional: []
  },

  tokenDeployment: {
    mandatory: [
      {
        parameter: 'token_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      }
    ],
    optional: []
  },

  startMint: {
    mandatory: [
      {
        parameter: 'token_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
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
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'total_gas_for_mint',
        validatorMethod: 'validateNonZeroWeiValue'
      }
    ],
    optional: []
  },

  grantEthStakeCurrency: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'address',
        validatorMethod: 'validateEthAddress'
      }
    ],
    optional: []
  },

  tokenDashboard: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'token_id',
        validatorMethod: 'validateNonZeroInteger'
      }
    ],
    optional: []
  },

  generateKnownAddress: {
    mandatory: [],
    optional: []
  }
};

module.exports = signature;
