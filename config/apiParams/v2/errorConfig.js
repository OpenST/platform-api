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
  invalid_wallet_address: {
    parameter: 'wallet_address',
    code: 'invalid',
    message: 'Invalid wallet_address'
  },
  invalid_personal_sign_address: {
    parameter: 'personal_sign_address',
    code: 'invalid',
    message: 'Invalid personal_sign_address'
  }
};

module.exports = v2ErrorConfig;
