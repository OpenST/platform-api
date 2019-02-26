'use strict';

const rootPrefix = '..',
  logger = require(rootPrefix + '/providers/logger'),
  Formatter = require(rootPrefix + '/helpers/Formatter'),
  BigNumber = require('bignumber.js');

const oThis = (module.exports = {
  val: function(dObj) {
    if (Formatter.isNull(dObj)) {
      return null;
    }

    for (var k in dObj) {
      if (dObj.hasOwnProperty(k)) {
        return dObj[k];
      }
    }
  },

  toString: function(dObj) {
    let val = oThis.val(dObj);
    return Formatter.toString(val);
  },
  toNonEmptyString: function(dObj) {
    let val = oThis.val(dObj);
    return Formatter.toNonEmptyString(val);
  },

  toNumber: function(dObj) {
    let val = oThis.val(dObj);
    return Formatter.toNumber(val);
  },
  toValidNumber: function(dObj) {
    let val = oThis.val(dObj);
    return Formatter.toValidNumber(val);
  },

  toEth: function(dObj) {
    let val = oThis.val(dObj);
    return Formatter.toEth(val);
  },

  toFloatEth: function(dObj) {
    let val = oThis.val(dObj);
    return Formatter.toFloatEth(val);
  },

  toValidFloatEth: function(dObj) {
    let val = oThis.val(dObj);
    return Formatter.toValidFloatEth(val);
  },

  toEthBN: function(dObj) {
    let val = oThis.val(dObj);
    return Formatter.toEthBN(val);
  },

  toBN: function(dObj) {
    let val = oThis.val(dObj);
    return Formatter.toBN(val);
  },

  toSecondTimestamp: function(dObj) {
    let val = oThis.val(dObj);
    let ms = Formatter.toValidNumber(val);
    if (ms <= 10000000000) {
      return ms;
    } else {
      return Formatter.toNumber((Formatter.toValidNumber(val) / 1000).toFixed(0));
    }
  }
});
