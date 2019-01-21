'use strict';

const errorConfig = {
  missing_client_id: {
    parameter: 'client_id',
    code: 'missing',
    message: 'missing client id'
  },
  invalid_client_id: {
    parameter: 'client_id',
    code: 'invalid',
    message: 'Invalid client id'
  },
  insufficient_airdrop_amount: {
    parameter: 'amount',
    code: 'invalid',
    message:
      'Available token amount is insufficient. Please mint more tokens or reduce the amount to complete the process.'
  },
  missing_number_of_users: {
    parameter: 'number_of_users',
    code: 'missing',
    message: 'Invalid number of users'
  },
  missing_balances_to_fetch: {
    parameter: 'balances_to_fetch',
    code: 'missing',
    message: 'missing balances to fetch'
  },
  token_symbol_already_exists: {
    parameter: 'symbol',
    code: 'invalid',
    message: 'Symbol is already registered'
  },
  invalid_token_symbol: {
    parameter: 'token_symbol',
    code: 'invalid',
    message: 'Invalid Token Symbol'
  },
  missing_token_id: {
    parameter: 'token_id',
    code: 'missing',
    message: 'Missing Token Id'
  },
  missing_token_symbol: {
    parameter: 'token_symbol',
    code: 'missing',
    message: 'Missing Token Symbol'
  },
  missing_ethereum_addresses: {
    parameter: 'ethereum_addresses',
    code: 'missing',
    message: 'Missing ethereum_addresses'
  },
  missing_ethereum_address: {
    parameter: 'ethereum_address',
    code: 'missing',
    message: 'Missing ethereum_address'
  },
  missing_uuids: {
    parameter: 'uuids',
    code: 'missing',
    message: 'Missing uuids'
  },
  missing_amount: {
    parameter: 'amount',
    code: 'missing',
    message: 'Missing amount'
  },
  missing_client_token_id: {
    parameter: 'client_token_id',
    code: 'missing',
    message: 'Missing client_token_id'
  },
  missing_list_type: {
    parameter: 'list_type',
    code: 'missing',
    message: 'Missing list_type'
  },
  missing_airdrop_params: {
    parameter: 'airdrop_params',
    code: 'missing',
    message: 'Missing airdrop_params'
  },
  missing_stake_and_mint_params: {
    parameter: 'stake_and_mint_params',
    code: 'missing',
    message: 'Missing stake_and_mint_params'
  },
  missing_token_name: {
    parameter: 'name',
    code: 'missing',
    message: 'Missing token_name'
  },
  missing_token_symbol_icon: {
    parameter: 'symbol_icon',
    code: 'missing',
    message: 'Missing token_symbol_icon'
  },
  missing_transaction_uuids: {
    parameter: 'transaction_uuids',
    code: 'missing',
    message: 'Missing transaction_uuids'
  },
  invalid_airdropped_filter: {
    parameter: 'airdropped',
    code: 'invalid',
    message: 'airdropped can be True of False'
  },
  invalid_start_client_id: {
    parameter: 'start_client_id',
    code: 'missing',
    message: 'Invalid start client id'
  },
  missing_signer: {
    parameter: 'signer',
    code: 'missing',
    message: 'Invalid Signer'
  },
  missing_personal_sign: {
    parameter: 'personal_sign',
    code: 'missing',
    message: 'Invalid personal_sign'
  },
  missing_message_to_sign: {
    parameter: 'message_to_sign',
    code: 'missing',
    message: 'Invalid message_to_sign'
  },
  missing_chain_id: {
    parameter: 'chain_id',
    code: 'missing',
    message: 'Invalid chain_id'
  },
  missing_contract_address: {
    parameter: 'contract_address',
    code: 'missing',
    message: 'Invalid contract_address'
  },
  missing_staker_address: {
    parameter: 'staker_address',
    code: 'missing',
    message: 'Missing staker_address'
  },
  missing_token_id: {
    parameter: 'token_id',
    code: 'missing',
    message: 'Missing token_id'
  }
};

module.exports = errorConfig;
