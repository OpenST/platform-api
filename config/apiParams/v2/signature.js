'use strict';

const rootPrefix = '../../..',
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
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

  [apiName.getUserSalt]: {
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

  [apiName.activateUser]: {
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
        parameter: 'device_address',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'session_addresses',
        validatorMethod: 'validateEthAddressArray'
      },
      {
        parameter: 'recovery_owner_address',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'expiration_height',
        validatorMethod: 'validateString'
      },
      {
        parameter: 'spending_limit',
        validatorMethod: 'validateInteger'
      }
    ],
    optional: []
  },

  [apiName.getChain]: {
    mandatory: [
      {
        parameter: 'chain_id',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'client_id',
        validatorMethod: 'validateInteger'
      }
    ],
    optional: []
  },

  [apiName.getTokenHolder]: {
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

  [apiName.getUserList]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateInteger'
      }
    ],
    optional: [
      {
        parameter: 'id',
        validatorMethod: 'validateString'
      }
    ]
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
        parameter: 'api_signer_address',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'device_name',
        validatorMethod: 'validateString'
      },
      {
        parameter: 'device_uuid',
        validatorMethod: 'validateString'
      }
    ],
    optional: []
  },

  [apiName.getUserDevices]: {
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
    optional: [
      {
        parameter: 'addresses',
        validatorMethod: 'validateEthAddressArray'
      },
      {
        parameter: 'token_id',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'limit',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: pagination.paginationIdentifierKey,
        validatorMethod: 'validatePaginationIdentifier'
      }
    ]
  },

  [apiName.getUserDevice]: {
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
        parameter: 'addresses',
        validatorMethod: 'validateEthAddressArray'
      }
      // In this API, we are using the same service as getDevices for a user. Hence, we are
      // converting the device_address into an array. The parameter passed into getDevices
      // is an array of addresses called 'addresses'.
    ],
    optional: []
  },

  [apiName.getUserSessions]: {
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
    optional: [
      {
        parameter: 'addresses',
        validatorMethod: 'validateEthAddressArray'
      },
      {
        parameter: 'token_id',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'limit',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: pagination.paginationIdentifierKey,
        validatorMethod: 'validatePaginationIdentifier'
      }
    ]
  },

  [apiName.getUserSession]: {
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
        parameter: 'addresses',
        validatorMethod: 'validateEthAddressArray'
      }
      // In this API, we are using the same service as getSessions for a user. Hence, we are
      // converting the device_address into an array. The parameter passed into getSessions
      // is an array of addresses called 'addresses'.
    ],
    optional: []
  },

  [apiName.getUserDeviceManager]: {
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
    optional: [
      {
        parameter: 'token_id',
        validatorMethod: 'validateInteger'
      }
    ]
  },

  [apiName.postAuthorizeDevice]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'token_id',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'user_data',
        validatorMethod: 'validateObject'
      },
      {
        parameter: 'data_defination',
        validatorMethod: 'validateString'
      },
      {
        parameter: 'to',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'value',
        validatorMethod: 'validateString'
      },
      {
        parameter: 'calldata',
        validatorMethod: 'validateString'
      },
      {
        parameter: 'raw_calldata',
        validatorMethod: 'validateObject'
      },
      {
        parameter: 'operation',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'safe_tx_gas',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'data_gas',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'gas_price',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'gas_token',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'refund_receiver',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'signature',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'signer',
        validatorMethod: 'validateEthAddress'
      }
    ],
    optional: []
  },

  [apiName.postRevokeDevice]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'token_id',
        validatorMethod: 'validateInteger'
      },
      {
        parameter: 'user_data',
        validatorMethod: 'validateObject'
      }
    ],
    optional: [
      {
        parameter: 'token_id',
        validatorMethod: 'validateInteger'
      }
    ]
  },

  [apiName.getPricePoints]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateInteger'
      }
    ],
    optional: []
  }
};

module.exports = v2Signature;
