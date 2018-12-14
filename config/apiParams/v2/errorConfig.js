'use strict';

const v2ErrorConfig = {
  invalid_status_transactions_ledger: {
    parameter: 'status',
    code: 'invalid',
    message: 'status should have comma seperated status filters (eg: processing,waiting_for_mining,complete,failed)'
  }
};

module.exports = v2ErrorConfig;
