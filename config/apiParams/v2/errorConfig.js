/**
 * Module to define error config for API v2 errors.
 *
 * @module config/apiParams/v2/errorConfig
 */

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
      "The API Key is not entered correctly. Please inspect for what is being sent, verify it against the API KEY shown on developer's page in OST Platform and re-submit."
  },
  invalid_api_key_for_inactive_user: {
    parameter: 'api_key',
    code: 'invalid',
    message: 'This user has been marked as inactive.'
  },
  invalid_api_key_for_device_address: {
    parameter: 'api_key',
    code: 'invalid',
    message: 'This device has not been registered.'
  },
  invalid_api_key_for_revoked_device: {
    parameter: 'api_key',
    code: 'invalid',
    message: 'This device has been revoked.'
  },
  invalid_api_key_for_signer_address: {
    parameter: 'api_key',
    code: 'invalid',
    message: 'Invalid Api signer address.'
  },
  invalid_api_key_for_not_deployed_token: {
    parameter: 'api_key',
    code: 'invalid',
    message: 'Token Setup has not been completed.'
  },
  expired_api_key: {
    parameter: 'api_key',
    code: 'invalid',
    message: "API key is expired. Please get the active API KEY from Developer's page in OST Platform and re-try."
  },
  invalid_api_signature: {
    parameter: 'api_signature',
    code: 'invalid',
    message:
      'Incorrectly formed API signature. For information on how to form the signature please visit  https://dev.ost.com/platform/docs/api/#authentication .  Please rectify and re-submit.'
  },
  invalid_user_id: {
    parameter: 'user_id',
    code: 'invalid',
    message:
      'Invalid parameter user_id. This field accepts Version 4 UUID as an input. Please inspect for what is being sent, rectify and re-submit.'
  },
  invalid_redemption_product_id: {
    parameter: 'redeemable_sku_id',
    code: 'invalid',
    message: 'Invalid redeemable sku. Please inspect for what is being sent, rectify and re-submit.'
  },
  inactive_user_id: {
    parameter: 'user_id',
    code: 'invalid',
    message:
      "The user status is inactive. Please ensure user's wallet is setup properly on the user's device. Visit https://dev.ost.com/platform/docs/api for details on user wallet creation flow."
  },
  saas_inactive_user_id: {
    parameter: 'user_id',
    code: 'invalid',
    message:
      "The user status is inactive. Please ensure user's wallet is setup properly on the user's device. Visit https://dev.ost.com/platform/docs/api for details on user wallet creation flow."
  },
  user_not_found: {
    parameter: 'user_id',
    code: 'invalid',
    message:
      'Unable to find this user in your economy. Inspect if a correct value is being sent in user_id field and re-submit the request.'
  },
  invalid_redemption_id: {
    parameter: 'redemption_id',
    code: 'invalid',
    message:
      'Unable to find this user redemption in your economy. Inspect if a correct value is being sent in redemption_id field and re-submit the request.'
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
  invalid_session_addresses_length: {
    parameter: 'session_addresses',
    code: 'invalid',
    message:
      "Invalid parameter session_address. This field accepts data_type 'address' as input whose length should not be greater than 5. Please inspect for what is being sent, rectify and re-submit."
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
    message: 'Invalid request path'
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
  invalid_device_address_to_remove: {
    parameter: 'device_address',
    code: 'invalid',
    message:
      'Invalid parameter device_address. Signer address and device address can not be same. Please make sure they are different.'
  },
  invalid_recovery_owner_address: {
    parameter: 'recovery_owner_address',
    code: 'invalid',
    message:
      "Invalid parameter recovery_owner_address. This field accepts data_type 'address' as input which holds a 20 byte value. Please inspect for what is being sent, rectify and re-submit."
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
  redemption_ids_more_than_allowed_limit: {
    parameter: 'redemption_ids',
    code: 'invalid',
    message:
      'Max of 25 redemption_ids as filters in an api request has been put in place to ensure the performance and reliability. No of redemption_ids in this request possibly exceeds the threshold. Please verify and re-submit.'
  },
  redemption_product_ids_more_than_allowed_limit: {
    parameter: 'redeemable_sku_ids',
    code: 'invalid',
    message:
      'Max of 25 redeemable_sku_ids as filters in an api request has been put in place to ensure the performance and reliability. No of redeemable_sku_ids in this request possibly exceeds the threshold. Please verify and re-submit.'
  },
  invalid_chain_id: {
    parameter: 'chain_id',
    code: 'invalid',
    message:
      "Invalid parameter chain_id. You can get chain_id by sending a get request to 'tokens' endpoint. It is a positive integer value. Please inspect for what is being sent, rectify and re-submit."
  },
  price_point_not_available_for_chain_id: {
    parameter: 'chain_id',
    code: 'invalid',
    message:
      'Failed to fetch price_point. You are trying to fetch the price point for the origin chain. Please pass auxiliary chain ID.'
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
    message:
      "The user status has not been 'ACTIVATED' as the Recovery Owner Address verification failed. Please inspect for what is being sent, rectify and re-submit."
  },
  invalid_executable_data: {
    parameter: 'executable_data',
    code: 'invalid',
    message: 'Invalid executable_data. Please inspect for what is being sent, rectify and re-submit.'
  },
  insufficient_funds: {
    parameter: 'signer',
    code: 'invalid',
    message: 'The transfer could not be completed because the associated account does not have sufficient balance.'
  },
  session_key_spending_limit_breached: {
    parameter: 'signer',
    code: 'invalid',
    message:
      'The tokens being transferred are above the spending limit. Reduce the number of tokens to be transferred and re-submit the request.'
  },
  session_key_not_authorized: {
    parameter: 'signer',
    code: 'invalid',
    message:
      'Transaction failed as it was signed by an unauthorized session key. Please inspect if you are using an active session key to send the request.'
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
    message:
      'Invalid parameter raw_calldata. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api/#execute-a-transaction for details on how to form input parameters for transaction API.'
  },
  invalid_raw_calldata: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message:
      'Invalid parameter raw_calldata. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api for details on accepted datatypes for API parameters.'
  },
  invalid_meta_properties: {
    parameter: 'meta_properties',
    code: 'invalid',
    message: 'Invalid meta_properties'
  },
  invalid_raw_calldata_parameter_address: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message:
      'Invalid parameter raw_calldata. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api/#execute-a-transaction for details on how to form input parameters for transaction API.'
  },
  invalid_raw_calldata_parameter_amount: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message:
      'Invalid parameter raw_calldata. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api/#execute-a-transaction for details on how to form input parameters for transaction API.'
  },
  invalid_raw_calldata_pay_currency_code: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message:
      'Invalid parameter raw_calldata. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api/#execute-a-transaction for details on how to form input parameters for transaction API.'
  },
  invalid_raw_calldata_stake_currency_to_usd_value: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message:
      'Invalid parameter raw_calldata. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api/#execute-a-transaction for details on how to form input parameters for transaction API.'
  },
  invalid_raw_calldata_parameter_threshold: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message:
      'Invalid parameter raw_calldata. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api/#execute-a-transaction for details on how to form input parameters for transaction API.'
  },
  invalid_raw_calldata_parameter_spending_limit: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message:
      'Invalid parameter raw_calldata. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api/#execute-a-transaction for details on how to form input parameters for transaction API.'
  },
  invalid_raw_calldata_parameter_expiration_height: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message:
      'Invalid parameter raw_calldata. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api/#execute-a-transaction for details on how to form input parameters for transaction API.'
  },
  unauthorized_signer: {
    parameter: 'signer',
    code: 'invalid',
    message:
      'Access denied due to api signer. Please inspect if you are using a valid API signer Key and re-submit the request.'
  },
  unauthorized_device_address: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message:
      'Operation failed due to unauthorized device address. Please inspect if you are using device address of the device registered with the user to send the request.'
  },
  unauthorized_session_address: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message: 'Mentioned action cannot be performed on session address in raw_calldata.'
  },
  unauthorized_user_id: {
    parameter: 'user_id',
    code: 'invalid',
    message:
      'Operation failed due to unauthorized user id. Please inspect if you are sending a valid user id registered with the user to send the request.'
  },
  invalid_to: {
    parameter: 'to',
    code: 'invalid',
    message: 'Invalid to. Please inspect for what is being sent, rectify and re-submit.'
  },
  invalid_user_to_fetch_linked_address: {
    parameter: 'user_id',
    code: 'invalid',
    message: 'Invalid user_id. Please inspect for what is being sent, rectify and re-submit.'
  },
  invalid_signatures: {
    parameter: 'signatures',
    code: 'invalid',
    message:
      'Invalid parameter signatures. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api for details on accepted datatypes for API parameters.'
  },
  invalid_signature: {
    parameter: 'signature',
    code: 'invalid',
    message:
      'Incorrectly formed signature. For information on how to form the signature please visit  https://dev.ost.com/platform/docs/api/#authentication.'
  },
  device_involved_in_recovery_operation: {
    parameter: 'raw_calldata',
    code: 'invalid',
    message: 'Device address is involved in other pending recovery operation.'
  },
  invalid_old_device_address: {
    parameter: 'old_device_address',
    code: 'invalid',
    message:
      'Invalid parameter invalid_old_device_address. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api for details on accepted datatypes for API parameters.'
  },
  invalid_new_device_address: {
    parameter: 'new_device_address',
    code: 'invalid',
    message:
      'Invalid parameter new_device_address. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api for details on accepted datatypes for API parameters.'
  },
  same_new_and_old_device_addresses: {
    parameter: 'new_device_address',
    code: 'invalid',
    message:
      'New user device address on which wallet recovery is to be initiated should not be same as the old device address.'
  },
  invalid_new_recovery_owner_address: {
    parameter: 'new_recovery_owner_address',
    code: 'invalid',
    message:
      'Invalid parameter new_recovery_owner_address. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api for details on accepted datatypes for API parameters.'
  },
  invalid_old_linked_address: {
    parameter: 'old_linked_address',
    code: 'invalid',
    message:
      'Invalid parameter old_linked_address. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api for details on accepted datatypes for API parameters.'
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
    message:
      'Invalid parameter transaction_id. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api for details on accepted datatypes for API parameters.'
  },
  invalid_statuses: {
    parameter: 'statuses',
    code: 'invalid',
    message: 'Invalid statuses'
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
  invalid_addresses: {
    parameter: 'addresses',
    code: 'invalid',
    message: 'Invalid addresses'
  },
  invalid_user_data: {
    parameter: 'user_data',
    code: 'invalid',
    message: 'Invalid user_data. Please inspect for what is being sent, rectify and re-submit.'
  },
  invalid_value: {
    parameter: 'value',
    code: 'invalid',
    message: 'Invalid value. Please inspect for what is being sent, rectify and re-submit.'
  },
  invalid_calldata: {
    parameter: 'calldata',
    code: 'invalid',
    message:
      'Invalid parameter calldata. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api for details on accepted datatypes for API parameters.'
  },
  invalid_operation: {
    parameter: 'operation',
    code: 'invalid',
    message:
      'Invalid parameter operation. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api for details on accepted datatypes for API parameters.'
  },
  invalid_safe_tx_gas: {
    parameter: 'safe_tx_gas',
    code: 'invalid',
    message: 'Invalid safe_tx_gas. Please inspect for what is being sent, rectify and re-submit.'
  },
  invalid_data_gas: {
    parameter: 'data_gas',
    code: 'invalid',
    message: 'Invalid data_gas. Please inspect for what is being sent, rectify and re-submit.'
  },
  invalid_gas_price: {
    parameter: 'gas_price',
    code: 'invalid',
    message:
      'Invalid parameter gas_price. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api for details on accepted datatypes for API parameters.'
  },
  invalid_gas_token: {
    parameter: 'gas_token',
    code: 'invalid',
    message:
      'Invalid parameter gas_token. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api for details on accepted datatypes for API parameters.'
  },
  invalid_refund_receiver: {
    parameter: 'refund_receiver',
    code: 'invalid',
    message: 'Invalid refund_receiver. Please inspect for what is being sent, rectify and re-submit.'
  },
  invalid_signers: {
    parameter: 'signers',
    code: 'invalid',
    message:
      'Invalid parameter invalid_signers. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api for details on accepted datatypes for API parameters.'
  },
  invalid_nonce: {
    parameter: 'nonce',
    code: 'invalid',
    message:
      'Invalid parameter nonce. Please ensure the input is well formed or visit https://dev.ost.com/platform/docs/api for details on accepted datatypes for API parameters.'
  },
  invalid_token_shard_details: {
    parameter: 'token_shard_details',
    code: 'invalid',
    message: 'Invalid token_shard_details. Please inspect for what is being sent, rectify and re-submit.'
  },
  invalid_kind: {
    parameter: 'kind',
    code: 'invalid',
    message: 'Invalid kind'
  },
  invalid_minimum_expiration_height: {
    parameter: 'expiration_height',
    code: 'invalid',
    message: 'Expiration height should be a block at least 2hrs from now.'
  },
  invalid_webhook_id: {
    parameter: 'webhook_id',
    code: 'invalid',
    message: 'Webhook not found with this id.'
  },
  invalid_topics: {
    parameter: 'topics',
    code: 'invalid',
    message: 'Topic is not valid, please check the list of available topics on https://dev.ost.com.'
  },
  invalid_status: {
    parameter: 'status',
    code: 'invalid',
    message: 'Invalid status. Please check the list of available status on https://dev.ost.com.'
  },
  query_not_supported: {
    parameter: 'pagination_identifier',
    code: 'invalid',
    message: 'Please change the query as more than 10000 records are not supported.'
  },
  invalid_redemption_amount: {
    parameter: 'redemption_meta',
    code: 'invalid',
    message: 'Invalid redemption amount. Amount must have been changed as per current prices.'
  },
  invalid_redemption_country: {
    parameter: 'redemption_meta',
    code: 'invalid',
    message: 'Invalid redemption country. SKU is not available in this country.'
  },
  invalid_redemption_transfers: {
    parameter: 'redemption_meta',
    code: 'invalid',
    message: 'Invalid redemption request. For redemptions only one transfer can happen between user and company.'
  },
  invalid_redemption_product_name: {
    parameter: 'name',
    code: 'invalid',
    message: 'Invalid redemption product name .'
  },
  invalid_redemption_product_description: {
    parameter: 'description',
    code: 'invalid',
    message: 'Invalid redemption product description. Description length should be less than 1000.'
  },
  invalid_redemption_email: {
    parameter: 'redemption_meta',
    code: 'invalid',
    message: 'Invalid email address. For redemptions valid email is mandatory.'
  }
};

module.exports = v2ErrorConfig;
