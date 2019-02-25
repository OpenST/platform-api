'use strict';

const rootPrefix = '../../..',
  apiName = require(rootPrefix + '/lib/globalConstant/apiName'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination');

const v2Signature = {
  [apiName.getChain]: {
    mandatory: [
      {
        parameter: 'chain_id',
        validatorMethod: 'validateNonZeroInteger'
      }
    ],
    optional: []
  },

  [apiName.getPricePoints]: {
    mandatory: [
      {
        parameter: 'chain_id',
        validatorMethod: 'validateNonZeroInteger'
      }
    ],
    optional: []
  },

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
        parameter: 'limit',
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
        parameter: 'limit',
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
        parameter: 'limit',
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
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'token_id',
        validatorMethod: 'validateNonZeroInteger'
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
        validatorMethod: 'validateZeroWeiValue'
      },
      {
        parameter: 'calldata',
        validatorMethod: 'validateHexString'
      },
      {
        parameter: 'raw_calldata',
        validatorMethod: 'validateString'
      },
      {
        parameter: 'operation',
        validatorMethod: 'validateZeroInteger'
      },
      {
        parameter: 'safe_tx_gas',
        validatorMethod: 'validateZeroInteger'
      },
      {
        parameter: 'data_gas',
        validatorMethod: 'validateZeroInteger'
      },
      {
        parameter: 'gas_price',
        validatorMethod: 'validateZeroWeiValue'
      },
      {
        parameter: 'gas_token',
        validatorMethod: 'validateZeroEthAddress'
      },
      {
        parameter: 'refund_receiver',
        validatorMethod: 'validateZeroEthAddress'
      },
      {
        parameter: 'signatures',
        validatorMethod: 'validateHexString'
      },
      {
        parameter: 'signers',
        validatorMethod: 'validateEthAddressArray'
      },
      {
        parameter: 'nonce',
        validatorMethod: 'validateNonNegativeInteger'
      }
    ],
    optional: []
  },

  [apiName.postRevokeDevice]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'token_id',
        validatorMethod: 'validateNonZeroInteger'
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
        validatorMethod: 'validateZeroWeiValue'
      },
      {
        parameter: 'calldata',
        validatorMethod: 'validateHexString'
      },
      {
        parameter: 'raw_calldata',
        validatorMethod: 'validateString'
      },
      {
        parameter: 'operation',
        validatorMethod: 'validateZeroInteger'
      },
      {
        parameter: 'safe_tx_gas',
        validatorMethod: 'validateZeroInteger'
      },
      {
        parameter: 'data_gas',
        validatorMethod: 'validateZeroInteger'
      },
      {
        parameter: 'gas_price',
        validatorMethod: 'validateZeroWeiValue'
      },
      {
        parameter: 'gas_token',
        validatorMethod: 'validateZeroEthAddress'
      },
      {
        parameter: 'refund_receiver',
        validatorMethod: 'validateZeroEthAddress'
      },
      {
        parameter: 'signatures',
        validatorMethod: 'validateHexString'
      },
      {
        parameter: 'signers',
        validatorMethod: 'validateEthAddressArray'
      },
      {
        parameter: 'nonce',
        validatorMethod: 'validateNonNegativeInteger'
      }
    ],
    optional: []
  },

  [apiName.postAuthorizeSession]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'token_id',
        validatorMethod: 'validateNonZeroInteger'
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
        validatorMethod: 'validateZeroWeiValue'
      },
      {
        parameter: 'calldata',
        validatorMethod: 'validateHexString'
      },
      {
        parameter: 'raw_calldata',
        validatorMethod: 'validateString'
      },
      {
        parameter: 'operation',
        validatorMethod: 'validateZeroInteger'
      },
      {
        parameter: 'safe_tx_gas',
        validatorMethod: 'validateZeroInteger'
      },
      {
        parameter: 'data_gas',
        validatorMethod: 'validateZeroInteger'
      },
      {
        parameter: 'gas_price',
        validatorMethod: 'validateZeroWeiValue'
      },
      {
        parameter: 'gas_token',
        validatorMethod: 'validateZeroEthAddress'
      },
      {
        parameter: 'refund_receiver',
        validatorMethod: 'validateZeroEthAddress'
      },
      {
        parameter: 'signatures',
        validatorMethod: 'validateHexString'
      },
      {
        parameter: 'signers',
        validatorMethod: 'validateEthAddressArray'
      },
      {
        parameter: 'nonce',
        validatorMethod: 'validateNonNegativeInteger'
      }
    ],
    optional: []
  },

  [apiName.postRevokeSession]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'token_id',
        validatorMethod: 'validateNonZeroInteger'
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
        validatorMethod: 'validateZeroWeiValue'
      },
      {
        parameter: 'calldata',
        validatorMethod: 'validateHexString'
      },
      {
        parameter: 'raw_calldata',
        validatorMethod: 'validateString'
      },
      {
        parameter: 'operation',
        validatorMethod: 'validateZeroInteger'
      },
      {
        parameter: 'safe_tx_gas',
        validatorMethod: 'validateZeroInteger'
      },
      {
        parameter: 'data_gas',
        validatorMethod: 'validateZeroInteger'
      },
      {
        parameter: 'gas_price',
        validatorMethod: 'validateZeroWeiValue'
      },
      {
        parameter: 'gas_token',
        validatorMethod: 'validateZeroEthAddress'
      },
      {
        parameter: 'refund_receiver',
        validatorMethod: 'validateZeroEthAddress'
      },
      {
        parameter: 'signatures',
        validatorMethod: 'validateHexString'
      },
      {
        parameter: 'signers',
        validatorMethod: 'validateEthAddressArray'
      },
      {
        parameter: 'nonce',
        validatorMethod: 'validateNonNegativeInteger'
      }
    ],
    optional: []
  },

  [apiName.executeTransactionFromUser]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'token_id',
        validatorMethod: 'validateNonZeroInteger'
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
        parameter: 'raw_calldata',
        validatorMethod: 'validateString'
      },
      {
        parameter: 'signature',
        validatorMethod: 'validateHexString'
      },
      {
        parameter: 'signer',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'nonce',
        validatorMethod: 'validateNonNegativeInteger'
      }
    ],
    optional: [
      {
        parameter: 'meta_property',
        validatorMethod: 'validateMetaProperty'
      }
    ]
  },

  [apiName.executeTransactionFromCompany]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'to',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'raw_calldata',
        validatorMethod: 'validateString'
      }
    ],
    optional: [
      {
        parameter: 'meta_property',
        validatorMethod: 'validateMetaProperty'
      }
    ]
  },

  [apiName.getTransaction]: {
    mandatory: [
      {
        parameter: 'user_id',
        validatorMethod: 'validateUuidV4'
      },
      {
        parameter: 'transaction_id',
        validatorMethod: 'validateUuidV4'
      }
    ],
    optional: []
  },

  [apiName.getRules]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      }
    ],
    optional: [
      {
        parameter: 'token_id',
        validatorMethod: 'validateNonZeroInteger'
      }
    ]
  },

  [apiName.getUserTransactions]: {
    mandatory: [
      {
        parameter: 'user_id',
        validatorMethod: 'validateUuidV4'
      },
      {
        parameter: 'token_id',
        validatorMethod: 'validateNonZeroInteger'
      }
    ],
    optional: []
  },

  [apiName.getUserBalance]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'user_id',
        validatorMethod: 'validateUuid'
      },
      {
        parameter: 'api_signature_kind',
        validatorMethod: 'validateApiSignatureKind'
      }
    ],
    optional: [
      {
        parameter: 'token_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'user_data',
        validatorMethod: 'validateObject'
      },
      {
        parameter: 'token_shard_details',
        validatorMethod: 'validateObject'
      }
    ]
  }
};

module.exports = v2Signature;
