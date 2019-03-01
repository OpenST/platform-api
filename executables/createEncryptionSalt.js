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
  ConfigStrategyModel = require(rootPrefix + '/app/models/mysql/ConfigStrategy'),
  EncryptionSaltModel = require(rootPrefix + '/app/models/mysql/EncryptionSalt'),
  encryptionSaltConst = require(rootPrefix + '/lib/globalConstant/encryptionSalt');

const InsertSaltID = {
  perform: async function() {
    let insertedRec = await new EncryptionSaltModel().createEncryptionSalt(
      ConfigStrategyModel.encryptionPurpose,
      0,
      encryptionSaltConst.configStrategyKind
    );

    logger.log('Encryption Salt ID: ', insertedRec.insertId);
    process.exit(0);
  }
};

module.exports = InsertSaltID;
InsertSaltID.perform();
