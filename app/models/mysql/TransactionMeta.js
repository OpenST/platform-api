'use strict';

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  //LockableBaseKlass = require(rootPrefix + '/app/models/lockable_base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta');

const dbName = 'saas_big_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

const kinds = {
  '1': transactionMetaConst.tokenTransferTransactionType,
  '2': transactionMetaConst.stpTransferTransactionType,
  '3': transactionMetaConst.externalTokenTransferTransactionType
};

const invertedKinds = util.invert(kinds);

class TransactionMetaModel extends ModelBase {
  constructor() {
    super({ dbName: dbName });
    const oThis = this;

    oThis.tableName = 'transaction_meta';
  }

  get kinds() {
    return kinds;
  }

  get invertedKinds() {
    return invertedKinds;
  }

  get statuses() {
    return transactionMetaConst.statuses;
  }

  get invertedStatuses() {
    return transactionMetaConst.invertedStatuses;
  }

  get kinds() {
    return transactionMetaConst.kinds;
  }

  get invertedKinds() {
    return transactionMetaConst.invertedKinds;
  }
}

module.exports = TransactionMetaModel;
