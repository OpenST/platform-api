'use strict';

const v2Signature = {
  tokenDetails: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateInteger'
      }
    ],
    optional: []
  },

  get_transaction_ledger: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'id',
        validatorMethod: 'validateInteger'
      }
    ],
    optional: [
      { parameter: 'page_no', validatorMethod: 'validateInteger' },
      { parameter: 'order_by', validatorMethod: 'validateAlphaString' },
      { parameter: 'order', validatorMethod: 'validateOrderingString' },
      { parameter: 'page_no', validatorMethod: 'validateInteger' }
    ]
  },

  deviceManager: {
    mandatory: [
      {
        parameter: 'user_id',
        validatorMethod: 'validateUuid'
      }
    ],
    optional: [{ parameter: 'client_id', validatorMethod: 'validateInteger' }]
  }
};

module.exports = v2Signature;
