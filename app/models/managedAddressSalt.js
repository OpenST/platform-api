'use strict';

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base');

const dbName = 'saas_client_economy_' + coreConstants.SUB_ENVIRONMENT + '_' + coreConstants.ENVIRONMENT;

class ManagedAddressSaltModel extends ModelBase {

  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'managed_address_salts';
  }

  getById(id) {
    const oThis = this;
    return oThis
      .select('*')
      .where(['id=?', id])
      .fire();
  }
}

module.exports = ManagedAddressSaltModel;
