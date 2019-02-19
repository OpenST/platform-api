'use strict';

const rootPrefix = '../../..',
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName');

const v2Signature = {
  [apiName.getToken]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      }
    ],
    optional: []
  },

  [apiName.createUser]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'kind',
        validatorMethod: 'validateUserKindString'
      }
    ],
    optional: [
      {
        parameter: 'token_id',
        validatorMethod: 'validateNonZeroInteger'
      }
    ]
  },

  [apiName.getUser]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'user_id',
        validatorMethod: 'validateUuidV4'
      }
    ],
    optional: [
      {
        parameter: 'token_id',
        validatorMethod: 'validateNonZeroInteger'
      }
    ]
  },

  [apiName.getUserSalt]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
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
        validatorMethod: 'validateNonZeroInteger'
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
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'spending_limit',
        validatorMethod: 'validateNonZeroWeiValue'
      }
    ],
    optional: []
  },

  [apiName.getChain]: {
    mandatory: [
      {
        parameter: 'chain_id',
        validatorMethod: 'validateNonZeroInteger'
      }
    ],
    optional: []
  },

  [apiName.getTokenHolder]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
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
        validatorMethod: 'validateNonZeroInteger'
      }
    ],
    optional: [
      {
        parameter: 'ids',
        validatorMethod: 'validateUuidV4Array'
      },
      {
        parameter: 'token_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: pagination.paginationIdentifierKey,
        validatorMethod: 'validateDdbPaginationIdentifier'
      }
    ]
  },

  [apiName.createUserDevice]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
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
        validatorMethod: 'validateNonZeroInteger'
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
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: pagination.paginationIdentifierKey,
        validatorMethod: 'validateDdbPaginationIdentifier'
      }
    ]
  },

  [apiName.getUserDevice]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'user_id',
        validatorMethod: 'validateUuidV4'
      },
      {
        parameter: 'address',
        validatorMethod: 'validateEthAddress'
      }
    ],
    optional: [
      {
        parameter: 'token_id',
        validatorMethod: 'validateNonZeroInteger'
      }
    ]
  },

  [apiName.getUserSessions]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
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
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: pagination.paginationIdentifierKey,
        validatorMethod: 'validateDdbPaginationIdentifier'
      }
    ]
  },

  [apiName.getUserSession]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'user_id',
        validatorMethod: 'validateUuidV4'
      },
      {
        parameter: 'address',
        validatorMethod: 'validateEthAddress'
      }
    ],
    optional: [
      {
        parameter: 'token_id',
        validatorMethod: 'validateNonZeroInteger'
      }
    ]
  },

  [apiName.getUserDeviceManager]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'user_id',
        validatorMethod: 'validateUuidV4'
      }
    ],
    optional: [
      {
        parameter: 'token_id',
        validatorMethod: 'validateNonZeroInteger'
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
        parameter: 'signatures',
        validatorMethod: 'validateString'
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
        parameter: 'signatures',
        validatorMethod: 'validateString'
      },
      {
        parameter: 'signer',
        validatorMethod: 'validateEthAddress'
      }
    ],
    optional: []
  },

  [apiName.postAuthorizeSession]: {
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
        validatorMethod: 'validateString'
      },
      {
        parameter: 'signer',
        validatorMethod: 'validateEthAddress'
      }
    ],
    optional: []
  },

  [apiName.postRevokeSession]: {
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
        validatorMethod: 'validateString'
      },
      {
        parameter: 'signer',
        validatorMethod: 'validateEthAddress'
      }
    ],
    optional: []
  },

  [apiName.getPricePoints]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      }
    ],
    optional: []
  }
};

module.exports = v2Signature;
