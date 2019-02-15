'use strict';
/**
 * This script will create a new salt
 *
 * @module executables/createEncryptionSalt
 *
 * Usage : node executables/createEncryptionSalt
 */
const rootPrefix = '..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  KmsWrapper = require(rootPrefix + '/lib/authentication/KmsWrapper'),
  ConfigStrategyModel = require(rootPrefix + '/app/models/mysql/ConfigStrategy'),
  EncryptionSaltModel = require(rootPrefix + '/app/models/mysql/EncryptionSalt'),
  encryptionSaltConst = require(rootPrefix + '/lib/globalConstant/encryptionSalt');

const InsertSaltID = {
  perform: async function() {
    const KMSObject = new KmsWrapper(ConfigStrategyModel.encryptionPurpose);

    KMSObject.generateDataKey().then(async function(a) {
      const addressSalt = a['CiphertextBlob'];

      let insertedRec = await new EncryptionSaltModel()
        .insert({
          kind: encryptionSaltConst.invertedKinds[encryptionSaltConst.configStrategyKind],
          salt: addressSalt,
          client_id: 0
        })
        .fire();

      logger.log('Encryption Salt ID: ', insertedRec.insertId);
      process.exit(0);
    });
  }
};

module.exports = InsertSaltID;
InsertSaltID.perform();
