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
  customKind: 'custom',
  tokenRuleKind: 'tokenRule'
};

rule.kinds = {
  '1': rule.pricerKind,
  '2': rule.customKind,
  '3': rule.tokenRuleKind
};

rule.invertedKinds = util.invert(rule.kinds);

rule.pricerRuleName = 'Pricer';
rule.pricerRuleContractName = 'PricerRule';
rule.tokenRuleName = 'TR';
rule.tokenRuleContractName = 'TokenRules';

module.exports = rule;
