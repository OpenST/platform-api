/*
 * Formatter for economy entity to convert keys to snake case
 */

class EconomyFormatter {
  /**
   * @constructor
   */
  constructor() {}

  /**
   * perform
   *
   * @param economyData
   * @return {{}}
   */
  perform(economyData) {
    let formattedTokenData = {};

    formattedTokenData.contract_address = economyData.contractAddress;
    formattedTokenData.sort_economy_by = economyData.sortEconomyBy;
    formattedTokenData.market_cap = economyData.marketCap;
    formattedTokenData.chain_id = economyData.chainId;
    formattedTokenData.total_supply = economyData.totalSupply;
    formattedTokenData.updated_timestamp = economyData.updatedTimestamp;
    formattedTokenData.name = economyData.displayName;
    formattedTokenData.symbol = economyData.displaySymbol;
    formattedTokenData.decimals = economyData.decimals;
    formattedTokenData.conversion_factor = economyData.conversionFactor;
    formattedTokenData.created_timestamp = economyData.createdTimestamp;
    formattedTokenData.total_volume = economyData.totalVolume || null;
    formattedTokenData.total_transfers = economyData.totalVolume || '0';
    formattedTokenData.total_token_holders = economyData.totalTokenHolders || '0';

    return formattedTokenData;
  }
}

module.exports = new EconomyFormatter();
