'use strict';
/**
 * Rules constants
 *
 * @module lib/globalConstant/rule
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

const rule = {
  pricerKind: 'pricer',
  customKind: 'custom'
};

rule.kinds = {
  '1': rule.pricerKind,
  '2': rule.customKind
};

rule.invertedKinds = util.invert(rule.kinds);

module.exports = rule;
