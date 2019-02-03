'use strict';

const rootPrefix = '../../..',
  apiName = require(rootPrefix + '/lib/globalConstant/apiName');

const v2Signature = {
  [apiName.getToken]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateInteger'
      }
    ],
    optional: []
  },

  [apiName.createUser]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateInteger'
      }
    ],
    optional: [{ parameter: 'kind', validatorMethod: 'validateUserKindString' }]
  },

  [apiName.getUser]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'user_id',
        validatorMethod: 'validateUuidV4'
      }
    ],
    optional: []
  },

  [apiName.createUserDevice]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'user_id',
        validatorMethod: 'validateUuidV4'
      },
      {
        parameter: 'address',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'personal_sign_address',
        validatorMethod: 'validatePersonalSign'
      },
      {
        parameter: 'device_name',
        validatorMethod: 'validateString'
      },
      {
        parameter: 'device_uuid',
        validatorMethod: 'validateUuidV4'
      }
    ],
    optional: []
  },

  [apiName.getUserDevice]: {
    mandatory: [
      {
        parameter: 'token_id',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'user_id',
        validatorMethod: 'validateUuidV4'
      }
    ],
    optional: [
      {
        parameter: 'address',
        validatorMethod: 'validateEthAddress'
      }
    ]
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
