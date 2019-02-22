'use strict';

const rootPrefix = '../../..',
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature');

const v2ErrorConfig = {
  invalid_api_signature_kind: {
    parameter: 'api_signature_kind',
    code: 'invalid',
    message: `List of supported api signature kinds (${apiSignature.hmacKind}, ${apiSignature.personalSignKind})`
  },
  unsupported_api_signature_kind: {
    parameter: 'api_signature_kind',
    code: 'invalid',
    message: `This api signature kind is not supported for this endpoint.`
  },
  invalid_api_request_timestamp: {
    parameter: 'api_request_timestamp',
    code: 'invalid',
    message: `Timestamp should be an integer of 10 digits`
  },
  expired_api_request_timestamp: {
    parameter: 'api_request_timestamp',
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
    parameter: 'api_signature',
    code: 'invalid',
    message: `Invalid api_signature`
  },
  invalid_user_id: {
    parameter: 'user_id',
    code: 'invalid',
    message: `Invalid user_id`
  },
  user_not_found: {
    parameter: 'user_id',
    code: 'invalid',
    message: `User not found`
  },
  session_not_found: {
    parameter: 'session_address',
    code: 'invalid',
    message: `User session not found`
  },
  invalid_session_addresses: {
    parameter: 'session_addresses',
    code: 'invalid',
    message: `Invalid session_addresses`
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
  invalid_request_path: {
    parameter: 'request_path',
    code: 'invalid',
    message: `Invalid request path`
  },
  invalid_token_id: {
    parameter: 'token_id',
    code: 'invalid',
    message: 'Invalid token id'
  },
  invalid_signer_address: {
    parameter: 'signer',
    code: 'invalid',
    message: 'Invalid address'
  },
  invalid_device_address: {
    parameter: 'device_address',
    code: 'invalid',
    message: 'Invalid device_address.'
  },
  ids_more_than_allowed_limit: {
    parameter: 'ids',
    code: 'invalid',
    message: 'Ids cannot be more than max page limit.'
  },
  addresses_more_than_allowed_limit: {
    parameter: 'addresses',
    code: 'invalid',
    message: 'Addresses cannot be more than max page limit.'
  },
  invalid_chain_id: {
    parameter: 'chain_id',
    code: 'invalid',
    message: 'Invalid chain id'
  },
  user_activation_failed_invalid_user: {
    parameter: 'user_id',
    code: 'invalid',
    message: 'Either user does not exists or not allowed to be activated.'
  },
  user_activation_failed_invalid_device: {
    parameter: 'device_address',
    code: 'invalid',
    message: 'Either device not registered or not allowed to be authorized.'
  },
  unauthorized_to_access_other_user_information: {
    parameter: 'user_id',
    code: 'invalid',
    message: 'Unauthorized to access other user details.'
  },
  invalid_raw_calldata_method: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message: 'Invalid method in raw_calldata'
  },
  invalid_raw_calldata_parameter_address: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message: 'Invalid address in raw_calldata parameters'
  },
  invalid_raw_calldata_parameter_threshold: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message: 'Invalid threshold in raw_calldata parameters'
  },
  invalid_raw_calldata_parameter_spending_limit: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message: 'Invalid spending limit in raw_calldata parameters'
  },
  invalid_raw_calldata_parameter_expiration_height: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message: 'Invalid expiration height in raw_calldata parameters'
  },
  unauthorized_signer: {
    parameter: 'signer',
    code: 'invalid',
    message: 'Signer address is not valid to perform this action.'
  },
  unauthorized_device_address: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message: 'Mentioned action cannot be performed on device address in raw_calldata.'
  },
  unauthorized_session_address: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message: 'Mentioned action cannot be performed on session address in raw_calldata.'
  },
  unauthorized_user_id: {
    parameter: 'user_id',
    code: 'invalid',
    message: 'User is not valid to perform this action.'
  },
  invalid_to: {
    parameter: 'to',
    code: 'invalid',
    message: 'Invalid to address'
  },
  invalid_user_to_fetch_linked_address: {
    parameter: 'user_id',
    code: 'invalid',
    message: 'Invalid user to fetch linked address for device address'
  },
  invalid_signatures: {
    parameter: 'signatures',
    code: 'invalid',
    message: 'Invalid signature provided'
  },
  invalid_next_page_payload: {
    parameter: 'next_page_payload',
    code: 'invalid',
    message: 'Invalid next page payload'
  }
};

module.exports = v2ErrorConfig;
