'use strict';

/*
* This script will create a new salt
*
* Usage : node executables/createEncryptionSalt
*
*
*/

const rootPrefix = '..',
  KmsWrapper = require(rootPrefix + '/lib/authentication/KmsWrapper'),
  encryptionSaltConst = require(rootPrefix + '/lib/globalConstant/encryptionSalt'),
  EncryptionSaltModel = require(rootPrefix + '/app/models/mysql/EncryptionSalt');

const InsertSaltID = {
  perform: async function() {
    const KMSObject = new KmsWrapper('knownAddresses');

    KMSObject.generateDataKey().then(async function(a) {
      const addressSalt = a['CiphertextBlob'];

      let insertedRec = await new EncryptionSaltModel()
        .insert({
          kind: encryptionSaltConst.invertedKinds[encryptionSaltConst.configStrategyKind],
          salt: addressSalt
        })
        .fire();

      console.log('Encryption Salt ID: ', insertedRec.insertId);
      process.exit(0);
    });
  }
};

module.exports = InsertSaltID;
InsertSaltID.perform();
