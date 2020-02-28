/**
 * Module to define error config for internal errors.
 *
 * @module config/apiParams/internal/errorConfig
 */

const errorConfig = {
  invalid_signer: {
    parameter: 'signer',
    code: 'invalid',
    message: 'Invalid address'
  },
  invalid_personal_sign: {
    parameter: 'personal_sign',
    code: 'invalid',
    message:
      'We use openst.personal.sign (/OST1-Personal-Sign) authentication to proof the ownership of an account using their personal_sign_address. This field accepts data_type "address" as input which holds a 20 byte value. Please inspect for what is being sent, rectify and re-submit.'
  },
  invalid_message_to_sign: {
    parameter: 'message_to_sign',
    code: 'invalid',
    message:
      'Invalid parameter message_to_sign. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api for details on accepted datatypes for API parameters.'
  },
  invalid_token_id: {
    parameter: 'token_id',
    code: 'invalid',
    message: 'Invalid token id'
  },
  invalid_client_id: {
    parameter: 'client_id',
    code: 'invalid',
    message:
      'Invalid parameter client_id. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api for details on accepted datatypes for API parameters.'
  },
  invalid_approve_transaction_hash: {
    parameter: 'approve_transaction_hash',
    code: 'invalid',
    message:
      'Invalid parameter approve_transaction_hash. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api for details on accepted datatypes for API parameters.'
  },
  invalid_request_stake_transaction_hash: {
    parameter: 'request_stake_transaction_hash',
    code: 'invalid',
    message:
      'Invalid parameter request_stake_transaction_hash. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api for details on accepted datatypes for API parameters.'
  },
  invalid_staker_address: {
    parameter: 'staker_address',
    code: 'invalid',
    message:
      'Invalid parameter staker_address. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api for details on accepted datatypes for API parameters.'
  },
  invalid_fe_stake_currency_to_stake: {
    parameter: 'fe_stake_currency_to_stake',
    code: 'invalid',
    message: 'Please enter a valid number.'
  },
  invalid_fe_bt_to_mint: {
    parameter: 'fe_bt_to_mint',
    code: 'invalid',
    message: 'Please enter a valid number.'
  },
  invalid_total_gas_for_mint: {
    parameter: 'total_gas_for_mint',
    code: 'invalid',
    message: 'Invalid total_gas_for_mint. Please inspect for what is being sent, rectify and re-submit.'
  },
  invalid_address: {
    parameter: 'address',
    code: 'invalid',
    message:
      'Invalid parameter address. This field accepts data_type "address" as input which holds a 20 byte value. Please inspect for what is being sent, rectify and re-submit.'
  },
  invalid_currencies: {
    parameter: 'currencies',
    code: 'invalid',
    message: 'One or more currencies provided in the currencies array is invalid'
  },

  invalid_bt_to_mint: {
    parameter: 'bt_to_mint',
    code: 'invalid',
    message: 'Invalid bt to mint amount'
  },

  invalid_stake_currency_to_stake: {
    parameter: 'stake_currency_to_stake',
    code: 'invalid',
    message: 'Invalid stake currency to stake'
  },

  invalid_redemption_id: {
    parameter: 'redemption_id',
    code: 'invalid',
    message: 'Invalid redemption id. Please inspect for what is being sent, rectify and re-submit.'
  }
};

module.exports = errorConfig;
