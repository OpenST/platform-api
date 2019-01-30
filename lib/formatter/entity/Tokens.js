'use strict';

const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic');

class TokenFormatter {
  /**
   *
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;

    oThis.params = params;
  }

  /**
   *
   *
   */
  perform() {
    const oThis = this,
      formattedTokenData = {};

    if (
      !oThis.params.tokenDetails.hasOwnProperty('id') ||
      !oThis.params.tokenDetails.hasOwnProperty('name') ||
      !oThis.params.tokenDetails.hasOwnProperty('symbol') ||
      !oThis.params.tokenDetails.hasOwnProperty('conversionFactor')
    ) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_t_1',
          api_error_identifier: 'entity_formatting_failed',
          debug_options: { tokenParams: oThis.params }
        })
      );
    }

    formattedTokenData['id'] = oThis.params.tokenDetails.id;
    formattedTokenData['name'] = oThis.params.tokenDetails.name;
    formattedTokenData['symbol'] = oThis.params.tokenDetails.symbol;
    formattedTokenData['conversionFactor'] = oThis.params.tokenDetails.conversionFactor;
    formattedTokenData['totalSupply'] = oThis.params.economyDetails.totalSupply;

    let originChainDetails = {};
    originChainDetails['chain_id'] = oThis.params.tokenDetails.originChainId;
    originChainDetails['branded_token'] = oThis.params.tokenAddresses.brandedTokenContract;

    formattedTokenData['origin_chain'] = originChainDetails;

    let originOrganization = {};
    originOrganization['contract'] = oThis.params.tokenAddresses.originOrganizationContract;
    originOrganization['owner'] = oThis.params.tokenAddresses.owner;
    formattedTokenData['origin_chain']['organization'] = originOrganization;
    originChainDetails['stakers'] = [oThis.params.tokenAddresses.owner];

    let auxiliaryChains = [],
      auxChainDetails = {};

    auxChainDetails['chain_id'] = oThis.params.tokenDetails.auxChainId;
    auxChainDetails['utility_branded_token'] = oThis.params.tokenAddresses.utilityBrandedTokenContract;

    // commission_beneficiary & credit_holder will be generated after token-holder deployment,
    auxChainDetails['commission_beneficiary'] = '';
    auxChainDetails['credit_holder'] = '';

    let auxOrganization = {};
    auxOrganization.contract = oThis.params.tokenAddresses.auxOrganizationContract;
    auxOrganization.owner = oThis.params.tokenAddresses.owner;
    auxChainDetails['organization'] = auxOrganization;

    auxiliaryChains.push(auxChainDetails);

    // currently, client can exists on one chain only.
    formattedTokenData['auxiliary_chains'] = [auxiliaryChains[0]];

    return Promise.resolve(responseHelper.successWithData(formattedTokenData));
  }
}

module.exports = TokenFormatter;
