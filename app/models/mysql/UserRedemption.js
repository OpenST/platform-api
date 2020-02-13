'use strict';

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const dbName = 'saas_big_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

class UserRedemptionModel extends ModelBase {
  constructor() {
    super({ dbName: dbName });
    const oThis = this;

    oThis.tableName = 'user_redemptions';
  }

  async fetchByUserId() {}
}

module.exports = UserRedemptionModel;
