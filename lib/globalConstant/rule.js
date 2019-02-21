'use strict';
/**
 * Rules constants
 *
 * @module lib/globalConstant/rule
 */

const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

let ruleKinds, invertedKinds;

class Rule {
  constructor() {}

  get pricerKind() {
    return 'pricer';
  }

  get customKind() {
    return 'custom';
  }

  get tokenRuleKind() {
    return 'tokenRule';
  }

  get pricerRuleName() {
    return 'Pricer';
  }

  get pricerRuleContractName() {
    return 'PricerRule';
  }

  get tokenRuleName() {
    return 'TR';
  }

  get tokenRuleContractName() {
    return 'TokenRules';
  }

  /**
   * Get rule kinds.
   * @returns {{"1": string, "2": string, "3": string}|*}
   */
  get kinds() {
    const oThis = this;

    if (ruleKinds) {
      return ruleKinds;
    }

    ruleKinds = {
      '1': oThis.pricerKind,
      '2': oThis.customKind,
      '3': oThis.tokenRuleKind
    };

    return ruleKinds;
  }

  /**
   * Inverted rule kinds.
   *
   * @returns {*}
   */
  get invertedKinds() {
    const oThis = this;

    if (invertedKinds) {
      return invertedKinds;
    }

    return util.invert(oThis.kinds);
  }

  /**
   * Joins two keys using "_"
   *
   * @param {String} key1
   * @param {String} key2
   * @returns {String}
   */
  getKey(key1, key2) {
    return key1 + '_' + key2;
  }
}

module.exports = new Rule();
