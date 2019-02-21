'use strict';

const rootPrefix = '..';

function define(name, value) {
  Object.defineProperty(exports, name, {
    value: value,
    enumerable: true
  });
}

/*****  Used by Lambda functions  start *****/
define('ENVIRONMENT', process.env.SA_ENVIRONMENT);
define('DEBUG_ENABLED', process.env.OST_DEBUG_ENABLED);
define('DYNAMO_INSERT_EVENT_NAME', 'INSERT');
define('DYNAMO_UPDATE_EVENT_NAME', 'MODIFY');
define('DYNAMO_DELETE_EVENT_NAME', 'REMOVE');
/*****  Used by Lambda functions end  *****/

define('esTransactionTablePostfix', '_transactions');
define('formAddressPrefix', 'f-');
define('toAddressPrefix', 't-');
define('fromAddressInKey', 'fa');
define('toAddressInKey', 'ta');
define('transactionUuidInKey', 'txuuid');
define('transactionUuidOutKey', 'id');
define('createdAtInKey', 'cts');
define('createdAtOutKey', 'created_at');
define('tokenIdInKey', 'ti');
define('tokenIdOutKey', 'token_id');
define('transactionHashInKey', 'txh');
define('transactionHashOutKey', 'transaction_hash');
define('statusInKey', 's');
define('statusOutKey', 'status');
define('metaInKey', 'mp');
define('metaOutKey', 'meta');
define('metaNameKey', 'n');
define('metaTypeKey', 't');
define('metaDetailsKey', 'd');
define('userAddressesInKey', 'trs');
define('userAddressesOutKey', 'user_addresses_status');
