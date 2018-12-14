'use strict';

const rootPrefix = '../../..';

const v2Signature = {
  test_api: {
    mandatory: [
      {
        parameter: 'client_id',
        error_identifier: 'missing_client_id'
      }
    ],
    optional: []
  },
  get_transaction_ledger: {
    mandatory: [
      {
        parameter: 'client_id',
        error_identifier: 'missing_client_id'
      },
      {
        parameter: 'id',
        error_identifier: 'missing_id'
      }
    ],
    optional: ['page_no', 'order_by', 'order', 'limit', 'status']
  }
};

module.exports = v2Signature;
