'use strict';

const rootPrefix = '../../..',
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature');

const v2ErrorConfig = {
  invalid_status_transactions_ledger: {
    parameter: 'status',
    code: 'invalid',
    message: 'status should have comma seperated status filters (eg: processing,waiting_for_mining,complete,failed)'
  },
  invalid_signature_kind: {
    parameter: 'signature_kind',
    code: 'invalid',
    message: `List of supported signature kinds (${apiSignature.hmacKind})`
  },
  unsupported_signature_kind: {
    parameter: 'signature_kind',
    code: 'invalid',
    message: `This signature kind is not supported for this endpoint.`
  },
  invalid_request_timestamp: {
    parameter: 'request_timestamp',
    code: 'invalid',
    message: `Timestamp should be an integer of 10 digits`
  },
  expired_request_timestamp: {
    parameter: 'request_timestamp',
    code: 'invalid',
    message: `Request has expired, please sign again and send`
  },
  invalid_api_key: {
    parameter: 'api_key',
    code: 'invalid',
    message: `Invalid API Key (Case Sensitive)`
  },
  expired_api_key: {
    parameter: 'api_key',
    code: 'invalid',
    message: `API Key has expired. Please contact support to create a fresh pair`
  },
  invalid_api_signature: {
    parameter: 'signature',
    code: 'invalid',
    message: `Invalid signature`
  },
  invalid_user_id: {
    parameter: 'user_id',
    code: 'invalid',
    message: `Invalid user_id`
  },
  invalid_request_path: {
    parameter: 'request_path',
    code: 'invalid',
    message: `Invalid request path`
  },
  invalid_client_id: {
    parameter: 'client_id',
    code: 'invalid',
    message: 'Invalid client id'
  },
  invalid_token_id: {
    parameter: 'token_id',
    code: 'invalid',
    message: 'Invalid token id'
  },
  invalid_id: {
    parameter: 'id',
    code: 'invalid',
    message: 'Invalid id'
  },
  invalid_wallet_address: {
    parameter: 'wallet_address',
    code: 'invalid',
    message: 'Invalid wallet_address'
  },
  invalid_personal_sign_address: {
    parameter: 'personal_sign_address',
    code: 'invalid',
    message: 'Invalid personal_sign_address'
  },
  invalid_api_signer_address: {
    parameter: 'api_signer_address',
    code: 'invalid',
    message: 'Invalid api_signer_address'
  },
  invalid_signer_address: {
    parameter: 'signer',
    code: 'invalid',
    message: 'Invalid address'
  },
  invalid_filter_address: {
    parameter: 'address',
    code: 'invalid',
    message: 'Invalid address. Max comma seperated 25 addresses allowed'
  },
  invalid_address: {
    parameter: 'address',
    code: 'invalid',
    message: 'Invalid address.'
  },
  invalid_device_name: {
    parameter: 'device_name',
    code: 'invalid',
    message: 'Invalid device_name.'
  },
  invalid_device_uuid: {
    parameter: 'device_uuid',
    code: 'invalid',
    message: 'Invalid device_uuid'
  },
  invalid_limit: {
    parameter: 'limit',
    code: 'invalid',
    message: 'Invalid limit'
  },
  invalid_pagination_identifier: {
    parameter: 'pagination_identifier',
    code: 'invalid',
    message: 'Invalid pagination_identifier'
  },
  token_not_setup: {
    parameter: 'client_id',
    code: 'invalid',
    message: 'Token not setup'
  }
};

module.exports = v2ErrorConfig;
