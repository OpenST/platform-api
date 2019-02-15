'use strict';

const rootPrefix = '../../..',
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature');

const v2ErrorConfig = {
  invalid_signature_kind: {
    parameter: 'signature_kind',
    code: 'invalid',
    message: `List of supported signature kinds (${apiSignature.hmacKind}, ${apiSignature.personalSignKind})`
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
  missing_api_signature: {
    parameter: 'signature',
    code: 'missing',
    message: `missing signature`
  },
  invalid_user_id: {
    parameter: 'user_id',
    code: 'invalid',
    message: `Invalid user_id`
  },
  invalid_session_addresses: {
    parameter: 'session_addresses',
    code: 'invalid',
    message: `Invalid session_addresses`
  },
  invalid_session_address: {
    parameter: 'session_address',
    code: 'invalid',
    message: `Invalid session_address`
  },
  invalid_expiration_height: {
    parameter: 'expiration_height',
    code: 'invalid',
    message: `Invalid expiration_height`
  },
  invalid_spending_limit: {
    parameter: 'spending_limit',
    code: 'invalid',
    message: `Invalid spending_limit`
  },
  invalid_known_address_ids: {
    parameter: 'knownAddressIds',
    code: 'invalid',
    message: `Invalid knownAddressIds`
  },
  missing_user_id: {
    parameter: 'user_id',
    code: 'missing',
    message: `missing user_id`
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
  missing_client_id: {
    parameter: 'client_id',
    code: 'missing',
    message: 'missing client id'
  },
  invalid_token_id: {
    parameter: 'token_id',
    code: 'invalid',
    message: 'Invalid token id'
  },
  missing_token_id: {
    parameter: 'token_id',
    code: 'missing',
    message: 'missing token id'
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
  missing_wallet_address: {
    parameter: 'wallet_address',
    code: 'missing',
    message: 'missing wallet_address'
  },
  invalid_personal_sign_address: {
    parameter: 'personal_sign_address',
    code: 'invalid',
    message: 'Invalid personal_sign_address'
  },
  missing_personal_sign_address: {
    parameter: 'personal_sign_address',
    code: 'missing',
    message: 'missing personal_sign_address'
  },
  invalid_api_signer_address: {
    parameter: 'api_signer_address',
    code: 'invalid',
    message: 'Invalid api_signer_address'
  },
  missing_api_signer_address: {
    parameter: 'api_signer_address',
    code: 'missing',
    message: 'missing api_signer_address'
  },
  invalid_signer_address: {
    parameter: 'signer',
    code: 'invalid',
    message: 'Invalid address'
  },
  missing_signer_address: {
    parameter: 'signer',
    code: 'missing',
    message: 'missing address'
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
  missing_address: {
    parameter: 'address',
    code: 'missing',
    message: 'missing address.'
  },
  invalid_device_address: {
    parameter: 'device_address',
    code: 'invalid',
    message: 'Invalid device_address.'
  },
  missing_device_address: {
    parameter: 'device_address',
    code: 'missing',
    message: 'missing device_address.'
  },
  invalid_device_name: {
    parameter: 'device_name',
    code: 'invalid',
    message: 'Invalid device_name.'
  },
  missing_device_name: {
    parameter: 'device_name',
    code: 'missing',
    message: 'missing device_name.'
  },
  invalid_device_uuid: {
    parameter: 'device_uuid',
    code: 'invalid',
    message: 'Invalid device_uuid'
  },
  missing_device_uuid: {
    parameter: 'device_uuid',
    code: 'missing',
    message: 'missing device_uuid'
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
  },
  invalid_chain_id: {
    parameter: 'chain_id',
    code: 'invalid',
    message: 'Invalid chain id'
  }
};

module.exports = v2ErrorConfig;
