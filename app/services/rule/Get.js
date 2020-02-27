const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  RuleCache = require(rootPrefix + '/lib/cacheManagement/kitSaasMulti/Rule'),
  TokenRuleDetailsByTokenId = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenRuleDetailsByTokenId'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ruleConstants = require(rootPrefix + '/lib/globalConstant/rule'),
  resultTypeConstants = require(rootPrefix + '/lib/globalConstant/resultType');

/**
 * Class to fetch token rules.
 *
 * @class GetRule
 */
class GetRule extends ServiceBase {
  /**
   * Constructor to fetch token rules.
   *
   * @param {object} params
   * @param {number} params.client_id
   * @param {number} [params.token_id]
   *
   * @augments ServiceBase
   *
   * @constructor
   */
  constructor(params) {
    super();

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.tokenId = params.token_id;
  }

  /**
   * Async performer.
   *
   * @returns {Promise<*|result>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    const tokenIdNamesArray = [];

    await oThis._validateTokenStatus();

    const tokenRulesDetails = await new TokenRuleDetailsByTokenId({ tokenId: oThis.tokenId }).fetch(),
      tokenRulesData = tokenRulesDetails.data;

    for (const eachTokenRule in tokenRulesData) {
      const tokenRule = tokenRulesData[eachTokenRule];
      const ruleTokenIdNameString = ruleConstants.getKey(tokenRule.ruleTokenId, tokenRule.ruleName);
      tokenIdNamesArray.push(ruleTokenIdNameString);
    }

    const finalResponse = {},
      rulesArray = [],
      ruleDetails = await new RuleCache({ ruleTokenIdNames: tokenIdNamesArray }).fetch(),
      ruleDetailsData = ruleDetails.data;

    for (const eachRule in ruleDetailsData) {
      const ruleEntity = {},
        rule = ruleDetailsData[eachRule],
        tokenRuleEntity = tokenRulesData[rule.name];

      ruleEntity.id = tokenRuleEntity.ruleId;
      ruleEntity.tokenId = tokenRuleEntity.tokenId;
      ruleEntity.name = tokenRuleEntity.ruleName;
      ruleEntity.address = tokenRuleEntity.address;
      ruleEntity.abi = rule.abi;
      ruleEntity.updatedTimestamp = tokenRuleEntity.updatedAt;

      rulesArray.push(ruleEntity);
    }
    finalResponse[resultTypeConstants.rules] = rulesArray;

    return responseHelper.successWithData(finalResponse);
  }
}

module.exports = GetRule;
