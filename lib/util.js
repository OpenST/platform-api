'use strict';

const Crypto = require('crypto'),
  web3Utils = require('web3-utils'),
  Buffer = require('safe-buffer').Buffer;

class Util {
  constructor() {}

  formatDbDate(dateObj) {
    function pad(n) {
      return n < 10 ? '0' + n : n;
    }

    return (
      dateObj.getFullYear() +
      '-' +
      pad(dateObj.getMonth() + 1) +
      '-' +
      pad(dateObj.getDate()) +
      ' ' +
      pad(dateObj.getHours()) +
      ':' +
      pad(dateObj.getMinutes()) +
      ':' +
      pad(dateObj.getSeconds())
    );
  }

  invert(json) {
    let ret = {};
    for (let key in json) {
      ret[json[key]] = key;
    }
    return ret;
  }

  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  asciiToHex(str) {
    var arr1 = [];
    for (var n = 0, l = str.length; n < l; n++) {
      var hex = Number(str.charCodeAt(n)).toString(16);
      arr1.push(hex);
    }
    return '0x' + arr1.join('');
  }

  /**
   * Generate Random Passphrase.
   *
   * @return {String}
   */
  generatePassphrase(length) {
    length = length || 30;

    var charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@%*#^*',
      retVal = '';

    for (var i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }

    return retVal;
  }

  /**
   * Generate Hash Lock for secret string
   *
   * @return {Object}
   */
  generateHashLock(secretString) {
    const MosaicJs = require('@openst/mosaic.js');

    return MosaicJs.Helpers.StakeHelper.toHashLock(secretString);
  }

  /**
   * Create Sha256 for given String
   *
   * @return {String}
   */
  createSha256Digest(string) {
    let hmac = Crypto.createHmac('sha256', string);
    return hmac.digest('hex');
  }

  /**
   * Get hashlock given a secret
   *
   * @param secretString
   * @returns {{secret: *, unlockSecret: string, hashLock: *}}
   */
  getSecretHashLock(secretString) {
    if (!secretString) {
      secretString = Crypto.randomBytes(16).toString('hex');
    }
    let secretBytes = Buffer.from(secretString);
    return {
      secret: secretString,
      unlockSecret: '0x' + secretBytes.toString('hex'),
      hashLock: web3Utils.keccak256(secretString)
    };
  }
}

module.exports = new Util();
