'use strict';

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  KmsWrapper = require(rootPrefix + '/lib/authentication/KmsWrapper'),
  encryptionSaltConst = require(rootPrefix + '/lib/globalConstant/encryptionSalt'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base');

const dbName = 'saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

class EncryptionSalt extends ModelBase {
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'encryption_salts';
  }

  getById(id) {
    const oThis = this;
    return oThis
      .select('*')
      .where(['id=?', id])
      .fire();
  }

  getByTokenIdAndKind(token_id, kind) {
    const oThis = this;
    return oThis
      .select('*')
      .where(['token_id=? AND kind=?', token_id, kind])
      .fire();
  }

  /**
   * Create Encryption Salt for given token and kind.
   *
   * @param purpose
   * @param tokenId
   * @param kind
   * @returns {Promise<any>}
   */
  createEncryptionSalt(purpose, tokenId, kind) {
    const oThis = this;

    const KMSObject = new KmsWrapper(purpose);

    return new Promise(function(onResolve, onReject) {
      KMSObject.generateDataKey()
        .then(async function(a) {
          const addressSalt = a['CiphertextBlob'];

          let insertedRec = await oThis
            .insert({
              kind: encryptionSaltConst.invertedKinds[kind],
              salt: addressSalt,
              token_id: tokenId
            })
            .fire();
          onResolve(insertedRec);
        })
        .catch(function(err) {
          logger.error('Error while creating KMS salt: ', err);
          onResolve({});
        });
    });
  }
}

module.exports = EncryptionSalt;
