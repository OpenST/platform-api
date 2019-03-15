/**
 * This class generates new device address and session address for given users
 *
 * @type {string}
 */
const rootPrefix = '../../..',
  GeneratePrivateKey = require(rootPrefix + '/tools/helpers/GeneratePrivateKey');

/**
 * GenerateRequiredAddresses
 *
 */
class GenerateRequiredAddresses {
  /**
   * @param {Array} userIdsArray
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;

    oThis.userIdsArray = params.userIdsArray;
  }

  /**
   * Returns hash indexed by uuid. Hash includes device's and session's address and private key.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    let oThis = this,
      addressesHash = {},
      generatePrivateKey = new GeneratePrivateKey();

    for (let i = 0; i < oThis.userIdsArray.length; i++) {
      let userUuid = oThis.userIdsArray[i],
        deviceAddressDetailsRsp = generatePrivateKey.perform(),
        sessionAddressDetailsRsp = generatePrivateKey.perform();

      addressesHash[userUuid] = {
        deviceAddress: deviceAddressDetailsRsp.data.address,
        deviceAddressPrivateKey: deviceAddressDetailsRsp.data.privateKey,
        sessionAddress: sessionAddressDetailsRsp.data.address,
        sessionPrivateKey: sessionAddressDetailsRsp.data.privateKey
      };
    }

    return addressesHash;
  }
}

module.exports = GenerateRequiredAddresses;
