'use strict';

const rootPrefix = '../../..',
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature');

const v2ErrorConfig = {
  invalid_api_signature_kind: {
    parameter: 'api_signature_kind',
    code: 'invalid',
    message:
      'Invalid parameter api_signature_kind. The 2 possible values are "OST1-HMAC-SHA256" and "OST1-Personal-Sign". Please inspect for what is being sent, rectify and re-submit.'
  },
  unsupported_api_signature_kind: {
    parameter: 'api_signature_kind',
    code: 'invalid',
    message:
      'Unsupported api_signature_kind. The 2 possible values are "OST1-HMAC-SHA256" and "OST1-Personal-Sign". Please inspect for what is being sent, rectify and re-submit.'
  },
  invalid_api_request_timestamp: {
    parameter: 'api_request_timestamp',
    code: 'invalid',
    message:
      'Invalid parameter api_request_timestamp. This field accepts epoc timestamp in secs. Please inspect for what is being sent, rectify and re-submit.'
  },
  expired_api_request_timestamp: {
    parameter: 'api_request_timestamp',
    code: 'invalid',
    message:
      'Timestamp expired: Given timestamp not within 100 secs of server time. Check your system time to reflect the current date & time and re-submit.'
  },
  invalid_api_key: {
    parameter: 'api_key',
    code: 'invalid',
    message:
      "The API Key is not entered correctly. Please inspect for what is being sent, verify it against the API KEY shown on developer's page in OSTKIT and re-submit."
  },
  invalid_api_key_for_inactive_user: {
    parameter: 'api_key',
    code: 'invalid',
    message: `This user has been marked as inactive.`
  },
  invalid_api_key_for_device_address: {
    parameter: 'api_key',
    code: 'invalid',
    message: `This device has not been registered.`
  },
  invalid_api_key_for_revoked_device: {
    parameter: 'api_key',
    code: 'invalid',
    message: `This device has been revoked.`
  },
  invalid_api_key_for_signer_address: {
    parameter: 'api_key',
    code: 'invalid',
    message: `Invalid Api signer address.`
  },
  invalid_api_key_for_not_deployed_token: {
    parameter: 'api_key',
    code: 'invalid',
    message: `Token Setup has not been completed.`
  },
  expired_api_key: {
    parameter: 'api_key',
    code: 'invalid',
    message: "API key is expired. Please get the active API KEY from Developer's page in OST KIT and re-try."
  },
  invalid_api_signature: {
    parameter: 'api_signature',
    code: 'invalid',
    message:
      'Incorrectly formed API signature. For information on how to form the signature please visit  https://dev.ost.com/kit/docs/api/#authentication .  Please rectify and re-submit.'
  },
  invalid_user_id: {
    parameter: 'user_id',
    code: 'invalid',
    message: `Invalid parameter user_id. This field accepts Version 4 UUID as an input. Please inspect for what is being sent, rectify and re-submit.`
  },
  inactive_user_id: {
    parameter: 'user_id',
    code: 'invalid',
    message: "User setup hasn't been started not completed yet."
  },
  saas_inactive_user_id: {
    parameter: 'user_id',
    code: 'invalid',
    message: `user_id is suspended. Please contact support`
  },
  user_not_found: {
    parameter: 'user_id',
    code: 'invalid',
    message: 'User not found. Please verify the parameter user_id is correct & valid Version 4 UUID and re-submit.'
  },
  session_not_found: {
    parameter: 'session_address',
    code: 'invalid',
    message:
      "Session not found. The parameter session_address accepts data_type 'address' as input which holds a 20 byte value. Please inspect that a correct address is being sent and re-submit."
  },
  invalid_session_addresses: {
    parameter: 'session_addresses',
    code: 'invalid',
    message:
      "Invalid parameter session_address. This field accepts data_type 'address' as input which holds a 20 byte value. Please inspect for what is being sent, rectify and re-submit."
  },
  invalid_expiration_height: {
    parameter: 'expiration_height',
    code: 'invalid',
    message:
      'Invalid Block expiration height. Given block expiration height not beyond 1200 blocks from the current block height. You can fetch the current block height by sending a GET request to /chains endpoint. Visit https://dev.ost.com'
  },
  invalid_spending_limit: {
    parameter: 'spending_limit',
    code: 'invalid',
    message:
      'Invalid spending Limit. The amount of tokens to be transferred is limited by spending limit.  This field accepts values 0 and above. Please verify and re-submit.'
  },
  invalid_known_address_ids: {
    parameter: 'knownAddressIds',
    code: 'invalid',
    message:
      'This field accepts array of addresses. Please inspect either the array is well formed OR ensure known addresses match the session addresses. Verify and re-submit.'
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
  invalid_client_id: {
    parameter: 'client_id',
    code: 'invalid',
    message: 'Invalid client id'
  },
  invalid_signer: {
    parameter: 'signer',
    code: 'invalid',
    message: 'Invalid address'
  },
  invalid_device_address: {
    parameter: 'device_address',
    code: 'invalid',
    message:
      "Invalid parameter device_address. This field accepts data_type 'address' as input which holds a 20 byte value. Please inspect for what is being sent, rectify and re-submit."
  },
  invalid_recovery_owner_address: {
    parameter: 'recovery_owner_address',
    code: 'invalid',
    message:
      "Invalid parameter session_address. This field accepts data_type 'address' as input which holds a 20 byte value. Please inspect for what is being sent, rectify and re-submit."
  },
  ids_more_than_allowed_limit: {
    parameter: 'ids',
    code: 'invalid',
    message:
      'Max of 25 IDs as filters in an api request has been put in place to ensure the performance and reliability. No of IDs in this request possibly exceeds the threshold. Please verify and re-submit.'
  },
  addresses_more_than_allowed_limit: {
    parameter: 'addresses',
    code: 'invalid',
    message:
      'Max of 25 addresses as filters in an api request has been put in place to ensure the performance and reliability. No of addresses in this request possibly exceeds the threshold. Please verify and re-submit.'
  },
  invalid_chain_id: {
    parameter: 'chain_id',
    code: 'invalid',
    message:
      "Invalid parameter chain_id. You can get chain_id by sending a get request to 'tokens' endpoint. It is a positive integer value. Please inspect for what is being sent, rectify and re-submit."
  },
  price_point_not_available_chain_id: {
    parameter: 'chain_id',
    code: 'invalid',
    message: 'Price point is not available for this chain id.'
  },
  user_activation_failed_invalid_user: {
    parameter: 'user_id',
    code: 'invalid',
    message:
      'Unable to activate the user. Inspect if a correct value is being sent in user_id field. If the problem persists contact support@ost.com.'
  },
  user_activation_failed_invalid_device: {
    parameter: 'device_address',
    code: 'invalid',
    message:
      'Unable to activate the user. Inspect if correct value is being sent in the device_address field. It accepts datatype "address" and holds a 20 byte value. If the problem persists contact support@ost.com .'
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
    message: 'The transfer could not be completed because the associated account does not have sufficient balance.'
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
    message:
      'You are not authorized to access the data you are trying to fetch. Inspect if a correct value is being sent in user_id field. Please verify and re-submit.'
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
  invalid_meta_property: {
    parameter: 'meta_property',
    code: 'invalid',
    message: 'Invalid meta_property'
  },
  invalid_raw_calldata_parameter_address: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message: 'Invalid address in raw_calldata parameters'
  },
  invalid_raw_calldata_parameter_amount: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message: 'Invalid amounts in raw_calldata parameters'
  },
  invalid_raw_calldata_pay_currency_code: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message: 'Invalid Pay Currency Code in raw_calldata parameters'
  },
  invalid_raw_calldata_ost_to_usd_value: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message: 'Invalid Ost To Usd Conversion Rate in raw_calldata parameters'
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
  device_involved_in_recovery_operation: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message: 'Device address is involved in other pending recovery operation.'
  },
  invalid_old_device_address: {
    parameter: 'old_device_address',
    code: 'invalid',
    message: 'Old device address is either invalid or not Authorized.'
  },
  invalid_new_device_address: {
    parameter: 'new_device_address',
    code: 'invalid',
    message: 'New device address is either invalid or not Registered.'
  },
  same_new_and_old_device_addresses: {
    parameter: 'new_device_address',
    code: 'invalid',
    message: 'New device cannot be same as old.'
  },
  invalid_new_recovery_owner_address: {
    parameter: 'new_recovery_owner_address',
    code: 'invalid',
    message: 'Recovery owner cannot be same as old.'
  },
  invalid_old_linked_address: {
    parameter: 'old_linked_address',
    code: 'invalid',
    message: 'Invalid address'
  },
  invalid_limit: {
    parameter: 'limit',
    code: 'invalid',
    message:
      'A limit of 25 objects in an api request has been put in place to ensure the performance and reliability. Parameter limit possibly exceeds the threshold. Please verify and re-submit'
  },
  invalid_transaction_id: {
    parameter: 'transaction_id',
    code: 'invalid',
    message: 'Invalid transaction id'
  },
  invalid_status: {
    parameter: 'status',
    code: 'invalid',
    message: 'Invalid status'
  },
  invalid_ids: {
    parameter: 'ids',
    code: 'invalid',
    message: 'Invalid ids'
  },
  invalid_api_signer_address: {
    parameter: 'api_signer_address',
    code: 'invalid',
    message: 'Invalid api_signer_address'
  },
  invalid_device_name: {
    parameter: 'device_name',
    code: 'invalid',
    message:
      'Invalid parameter device_name. This field is set or changed by the device operating system. Please inspect for what is being sent, rectify and re-submit.'
  },
  missing_device_name: {
    parameter: 'device_name',
    code: 'missing',
    message:
      'Required parameter device_name is missing. When you register a device you include device name for it to be easily recognizible.  Please inspect for what is being sent, rectify and re-submit.'
  },
  invalid_device_uuid: {
    parameter: 'device_uuid',
    code: 'invalid',
    message:
      'Invalid parameter device_uuid. This field is set by the device operating system. Please inspect the api request for what is being sent, rectify and re-submit.'
  },
  invalid_addresses: {
    parameter: 'addresses',
    code: 'invalid',
    message: 'Invalid addresses'
  },
  invalid_user_data: {
    parameter: 'user_data',
    code: 'invalid',
    message: 'Invalid user_data'
  },
  invalid_value: {
    parameter: 'value',
    code: 'invalid',
    message: 'Invalid value'
  },
  invalid_calldata: {
    parameter: 'calldata',
    code: 'invalid',
    message: 'Invalid calldata'
  },
  invalid_operation: {
    parameter: 'operation',
    code: 'invalid',
    message: 'Invalid operation'
  },
  invalid_safe_tx_gas: {
    parameter: 'safe_tx_gas',
    code: 'invalid',
    message: 'Invalid safe_tx_gas'
  },
  invalid_data_gas: {
    parameter: 'data_gas',
    code: 'invalid',
    message: 'Invalid data_gas'
  },
  invalid_gas_price: {
    parameter: 'gas_price',
    code: 'invalid',
    message: 'Invalid gas_price'
  },
  invalid_gas_token: {
    parameter: 'gas_token',
    code: 'invalid',
    message: 'Invalid gas_token'
  },
  invalid_refund_receiver: {
    parameter: 'refund_receiver',
    code: 'invalid',
    message: 'Invalid refund_receiver'
  },
  invalid_signers: {
    parameter: 'signers',
    code: 'invalid',
    message: 'Invalid signers'
  },
  invalid_nonce: {
    parameter: 'nonce',
    code: 'invalid',
    message: 'Invalid nonce'
  },
  invalid_token_shard_details: {
    parameter: 'token_shard_details',
    code: 'invalid',
    message: 'Invalid token_shard_details'
  },
  invalid_kind: {
    parameter: 'kind',
    code: 'invalid',
    message: 'Invalid kind'
  }
};

module.exports = v2ErrorConfig;
