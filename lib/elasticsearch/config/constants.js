'use strict';

const rootPrefix = '..';

function define(name, value) {
  Object.defineProperty(exports, name, {
    value: value,
    enumerable: true
  });
}

define('ENVIRONMENT', process.env.SA_ENVIRONMENT);
define('DEBUG_ENABLED', process.env.OST_DEBUG_ENABLED);
define('DYNAMO_INSERT_EVENT_NAME', 'INSERT');
define('DYNAMO_UPDATE_EVENT_NAME', 'MODIFY');
define('DYNAMO_DELETE_EVENT_NAME', 'REMOVE');
