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
  inactive_user_id: {
    parameter: 'user_id',
    code: 'invalid',
    message: `user setup hasn't been started / not completed yet.`
  },
  saas_inactive_user_id: {
    parameter: 'user_id',
    code: 'invalid',
    message: `user_id is suspended. Please contact support`
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
  invalid_recovery_owner_address: {
    parameter: 'recovery_owner_address',
    code: 'invalid',
    message: 'Invalid recovery_owner_address.'
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
  price_point_not_available_chain_id: {
    parameter: 'chain_id',
    code: 'invalid',
    message: 'Price point is not available for this chain id.'
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
  user_activation_failed_invalid_recovery_owner_address: {
    parameter: 'device_address',
    code: 'invalid',
    message: 'Either recovery owner address already exists or is not allowed to be authorized.'
  },
  invalid_executable_data: {
    parameter: 'executable_data',
    code: 'invalid',
    message: 'invalid executable_data'
  },
  insufficient_funds: {
    parameter: 'signer',
    code: 'invalid',
    message:
      'The account executing the transaction or transfer does not have sufficient funds to complete the transaction or transfer.'
  },
  session_key_spending_limit_breached: {
    parameter: 'signer',
    code: 'invalid',
    message: 'The session key being used is not authorised for this big amount.'
  },
  session_key_not_authorized: {
    parameter: 'signer',
    code: 'invalid',
    message: 'The session key being used is not authorised'
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
  invalid_raw_calldata: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message: 'Invalid raw_calldata'
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
  invalid_signature: {
    parameter: 'signature',
    code: 'invalid',
    message: 'Invalid signature provided'
  },
  old_device_address_not_authorized: {
    parameter: 'old_device_address',
    code: 'invalid',
    message: 'Old device address is either invalid or not Authorized.'
  },
  new_device_address_not_registered: {
    parameter: 'new_device_address',
    code: 'invalid',
    message: 'New device address is either invalid or not Registered.'
  },
  same_new_and_old_device_addresses: {
    parameter: 'new_device_address',
    code: 'invalid',
    message: 'New device cannot be same as old.'
  },
  same_new_and_old_recovery_owners: {
    parameter: 'new_recovery_owner_address',
    code: 'invalid',
    message: 'Recovery owner cannot be same as old.'
  },
  invalid_old_linked_address: {
    parameter: 'old_linked_address',
    code: 'invalid',
    message: 'Invalid address'
  },
  missing_transaction_id: {
    parameter: 'transaction_id',
    code: 'missing',
    message: `Missing transaction_id`
  },
  missing_token_holder_address: {
    parameter: 'tokenHolderAddress',
    code: 'missing',
    message: 'missing token holder address'
  },
  invalid_next_page_payload: {
    parameter: 'next_page_payload',
    code: 'invalid',
    message: 'Invalid next page payload'
  },
  invalid_limit: {
    parameter: 'limit',
    code: 'invalid',
    message: 'Invalid limit'
  },
  invalid_transaction_id: {
    parameter: 'transaction_id',
    code: 'invalid',
    message: 'Invalid transaction id'
  }
};

module.exports = v2ErrorConfig;
