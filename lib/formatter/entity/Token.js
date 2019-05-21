/**
 * Formatter for token entity to convert keys to snake case.
 *
 * @module lib/formatter/entity/Token
 */

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic');

/**
 * Class for token formatter.
 *
 * @class
 */
class TokenFormatter {
  /**
   * Constructor for token formatter.
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params;
  }

  /**
   * perform
   *
   * @returns {*}
   */
  perform() {
    const oThis = this,
      formattedTokenData = {};

    if (
      !oThis.params.tokenDetails.hasOwnProperty('id') ||
      !oThis.params.tokenDetails.hasOwnProperty('name') ||
      !oThis.params.tokenDetails.hasOwnProperty('symbol') ||
      !oThis.params.tokenDetails.hasOwnProperty('conversionFactor') ||
      !oThis.params.tokenDetails.hasOwnProperty('updatedTimestamp')
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_t_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { tokenParams: oThis.params }
        })
      );
    }

    formattedTokenData['id'] = Number(oThis.params.tokenDetails.id);
    formattedTokenData['name'] = oThis.params.tokenDetails.name;
    formattedTokenData['symbol'] = oThis.params.tokenDetails.symbol;
    formattedTokenData['base_token'] = oThis.params.tokenDetails.baseToken || null;
    formattedTokenData['conversion_factor'] = parseFloat(oThis.params.tokenDetails.conversionFactor);
    formattedTokenData['total_supply'] = oThis.params.economyDetails.totalSupply || '0';
    formattedTokenData['decimals'] = Number(oThis.params.tokenDetails.decimals);

    let originChainDetails = {};
    originChainDetails['chain_id'] = oThis.params.tokenDetails.originChainId
      ? Number(oThis.params.tokenDetails.originChainId)
      : null;
    originChainDetails['branded_token'] = oThis.params.tokenAddresses.brandedTokenContract || null;

    formattedTokenData['origin_chain'] = originChainDetails;

    let originOrganization = {};
    originOrganization['contract'] = oThis.params.tokenAddresses.originOrganizationContract || null;
    originOrganization['owner'] = oThis.params.tokenAddresses.owner || null;
    formattedTokenData['origin_chain']['organization'] = originOrganization;

    if (oThis.params.tokenAddresses.owner) {
      originChainDetails['stakers'] = [oThis.params.tokenAddresses.owner];
    } else {
      originChainDetails['stakers'] = [];
    }

    let auxiliaryChains = [],
      auxChainDetails = {};

    auxChainDetails['chain_id'] = oThis.params.tokenDetails.auxChainId
      ? Number(oThis.params.tokenDetails.auxChainId)
      : null;
    auxChainDetails['utility_branded_token'] = oThis.params.tokenAddresses.utilityBrandedTokenContract || null;

    // company_token_holders generated after token-holder deployment,
    auxChainDetails['company_token_holders'] = oThis.params.companyTokenHolderAddresses;

    let auxOrganization = {};
    auxOrganization.contract = oThis.params.tokenAddresses.auxOrganizationContract || null;
    auxOrganization.owner = oThis.params.tokenAddresses.owner || null;
    auxChainDetails['organization'] = auxOrganization;

    auxiliaryChains.push(auxChainDetails);

    // currently, client can exists on one chain only.
    formattedTokenData['auxiliary_chains'] = [auxiliaryChains[0]];

    formattedTokenData['base_token'] = 'OST';

    formattedTokenData['updated_timestamp'] = Number(oThis.params.tokenDetails.updatedTimestamp);

    return responseHelper.successWithData(formattedTokenData);
  }
}

module.exports = TokenFormatter;
