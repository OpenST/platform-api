/**
 * Module for API signature validations.
 *
 * @module config/apiParams/v2/signature
 */

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
    optional: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'token_id',
        validatorMethod: 'validateNonZeroInteger'
      }
    ]
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

  [apiName.getBaseTokens]: {
    mandatory: [],
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
        parameter: 'device_address',
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
        parameter: 'session_address',
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
      },
      {
        parameter: 'token_shard_details',
        validatorMethod: 'validateObject'
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
      },
      {
        parameter: 'token_shard_details',
        validatorMethod: 'validateObject'
      }
    ],
    optional: []
  },

  [apiName.postLogoutSessions]: {
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
      },
      {
        parameter: 'token_shard_details',
        validatorMethod: 'validateObject'
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
        parameter: 'token_shard_details',
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
        validatorMethod: 'validateMetaPropertyForInsertion'
      },
      {
        parameter: 'redemption_meta',
        validatorMethod: 'validateObject'
      }
    ]
  },

  [apiName.executeTransactionFromCompany]: {
    mandatory: [
      {
        parameter: 'user_id',
        validatorMethod: 'validateUuidV4'
      },
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
        validatorMethod: 'validateMetaPropertyForInsertion'
      }
    ]
  },

  [apiName.getTransaction]: {
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
        parameter: 'statuses',
        validatorMethod: 'validateAlphaStringArray'
      },
      {
        parameter: 'limit',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'meta_properties',
        validatorMethod: 'validateString'
      },
      {
        parameter: pagination.paginationIdentifierKey,
        validatorMethod: 'validateEsPaginationIdentifier'
      },
      {
        parameter: 'start_time',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'end_time',
        validatorMethod: 'validateNonZeroInteger'
      }
    ]
  },

  [apiName.getUserBalance]: {
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
  },

  [apiName.getRecoveryOwner]: {
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
        parameter: 'recovery_owner_address',
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

  [apiName.userPendingRecovery]: {
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

  [apiName.initiateRecovery]: {
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
        parameter: 'user_id',
        validatorMethod: 'validateUuidV4'
      },
      {
        parameter: 'old_linked_address',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'old_device_address',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'new_device_address',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'signature',
        validatorMethod: 'validateString'
      },
      {
        parameter: 'signer',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'to',
        validatorMethod: 'validateEthAddress'
      }
    ],
    optional: []
  },

  [apiName.abortRecovery]: {
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
        parameter: 'user_id',
        validatorMethod: 'validateUuidV4'
      },
      {
        parameter: 'old_linked_address',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'old_device_address',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'new_device_address',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'signature',
        validatorMethod: 'validateString'
      },
      {
        parameter: 'signer',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'to',
        validatorMethod: 'validateEthAddress'
      }
    ],
    optional: []
  },

  [apiName.resetRecoveryOwner]: {
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
        parameter: 'user_id',
        validatorMethod: 'validateUuidV4'
      },
      {
        parameter: 'new_recovery_owner_address',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'signature',
        validatorMethod: 'validateString'
      },
      {
        parameter: 'signer',
        validatorMethod: 'validateEthAddress'
      },
      {
        parameter: 'to',
        validatorMethod: 'validateEthAddress'
      }
    ],
    optional: []
  },

  [apiName.redemptionList]: {
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
      },
      {
        parameter: 'limit',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: pagination.paginationIdentifierKey,
        validatorMethod: 'validateMysqlPaginationIdentifier'
      },
      // TODO - redemption - why have we implemented filter on uuids
      {
        parameter: 'redemption_ids',
        validatorMethod: 'validateUuidV4Array'
      }
    ]
  },

  [apiName.redemptionGet]: {
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
        parameter: 'user_redemption_uuid',
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

  [apiName.createWebhook]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'url',
        validatorMethod: 'validateString'
      },
      {
        parameter: 'topics',
        validatorMethod: 'validateStringArray'
      }
    ],
    optional: [
      {
        parameter: 'status',
        validatorMethod: 'validateString'
      }
    ]
  },

  [apiName.updateWebhook]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'webhook_id',
        validatorMethod: 'validateUuidV4'
      },
      {
        parameter: 'topics',
        validatorMethod: 'validateStringArray'
      }
    ],
    optional: [
      {
        parameter: 'status',
        validatorMethod: 'validateString'
      }
    ]
  },

  [apiName.deleteWebhook]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'webhook_id',
        validatorMethod: 'validateUuidV4'
      }
    ],
    optional: []
  },

  [apiName.getWebhook]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'webhook_id',
        validatorMethod: 'validateUuidV4'
      }
    ],
    optional: []
  },

  [apiName.getAllWebhook]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      }
    ],
    optional: [
      {
        parameter: 'limit',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: pagination.paginationIdentifierKey,
        validatorMethod: 'validateMysqlPaginationIdentifier'
      }
    ]
  },

  [apiName.getRedemptionProduct]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'redemption_product_id',
        validatorMethod: 'validateNonZeroInteger'
      }
    ],
    optional: []
  },

  [apiName.getRedemptionProductsList]: {
    mandatory: [
      {
        parameter: 'client_id',
        validatorMethod: 'validateNonZeroInteger'
      }
    ],
    optional: [
      {
        parameter: 'limit',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: pagination.paginationIdentifierKey,
        validatorMethod: 'validateMysqlPaginationIdentifier'
      },
      {
        parameter: 'redeemable_sku_ids',
        validatorMethod: 'validateStringArray'
      }
    ]
  },
  [apiName.verifyTokenDomain]: {
    mandatory: [
      {
        parameter: 'token_id',
        validatorMethod: 'validateNonZeroInteger'
      },
      {
        parameter: 'domain',
        validatorMethod: 'validateString'
      }
    ],
    optional: []
  }
};

module.exports = v2Signature;
