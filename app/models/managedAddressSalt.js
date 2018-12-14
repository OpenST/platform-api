'use strict';

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ModelBaseKlass = require(rootPrefix + '/app/models/base');

const dbName = 'saas_client_economy_' + coreConstants.SUB_ENVIRONMENT + '_' + coreConstants.ENVIRONMENT;

class ManagedAddressSaltModel extends ModelBaseKlass {

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
