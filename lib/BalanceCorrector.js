/*
 * This class helps in correcting the balances of token holders
 */

const rootPrefix = '..',
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  GetUbtBalance = require(rootPrefix + '/lib/getBalance/Ubt'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress');

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/app/models/ddb/sharded/Balance');
require(rootPrefix + '/lib/cacheManagement/chainMulti/BalanceShard');
require(rootPrefix + '/lib/cacheManagement/chainMulti/Balance');

class BalanceCorrector {
  constructor(params) {
    const oThis = this;

    oThis.ubtAddressToTokenHoldersMap = params.ubtAddressToTokenHoldersMap;
  }

  async perform() {
    const oThis = this;

    await oThis._fetchBalancesFromGeth();

    await oThis._updateBalances();
  }

  /**
   * Fetch balances for given addresses from GETH
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchBalancesFromGeth() {
    const oThis = this;

    oThis.balanceMap = {};

    for (let erc20Address in oThis.ubtAddressToTokenHoldersMap) {
      let tokenAddressModel = new TokenAddressModel();

      let Rows = await tokenAddressModel
        .select('token_id, address')
        .where(['address = ? AND deployed_chain_id = ?', erc20Address, oThis._configStrategyObject.auxChainId])
        .fire();

      let tokenId = Rows[0].token_id;

      if (!tokenId) {
        return Promise.reject('Token id not found');
      }

      if (Rows[0].address != erc20Address) {
        console.log('====UBT address not matching ===', Rows[0].address, erc20Address);
        return Promise.reject('Fetched token id of another address');
      }

      let getUbtBalance = new GetUbtBalance({
        auxChainId: oThis._configStrategyObject.auxChainId,
        tokenId: tokenId,
        addresses: oThis.ubtAddressToTokenHoldersMap[erc20Address]
      });

      let ubtBalances = await getUbtBalance.perform();

      Object.assign(oThis.balanceMap, ubtBalances);
    }
  }

  /**
   * Correct balances as per geth
   *
   * @return {Promise<void>}
   * @private
   */
  async _updateBalances() {
    const oThis = this,
      BalanceModel = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceModel'),
      BalanceShardCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceShardCache');

    let erc20Addresses = Object.keys(oThis.ubtAddressToTokenHoldersMap);

    let balanceShardCacheObj = new BalanceShardCache({
      erc20Addresses: erc20Addresses,
      chainId: oThis._configStrategyObject.auxChainId
    });

    let balanceShardRsp = await balanceShardCacheObj.fetch();
    let balanceShardMap = balanceShardRsp.data;

    let promiseArray = [];

    for (let erc20Address in oThis.ubtAddressToTokenHoldersMap) {
      let balanceModelObj = new BalanceModel({
        shardNumber: balanceShardMap[erc20Address]
      });
      let tokenHolders = oThis.ubtAddressToTokenHoldersMap[erc20Address];

      for (let i = 0; i < tokenHolders.length; i++) {
        promiseArray.push(
          balanceModelObj
            .forceCorrectBalance({
              tokenHolderAddress: tokenHolders[i],
              erc20Address: erc20Address,
              blockChainUnsettledDebits: '0',
              blockChainSettledBalance: oThis.balanceMap[tokenHolders[i]],
              pessimisticSettledBalance: oThis.balanceMap[tokenHolders[i]]
            })
            .catch(function(err) {
              console.error('===== Error correcting balance for token holder', tokenHolders[i]);
              console.error(err);
            })
        );
      }

      await Promise.all(promiseArray);

      promiseArray = [];

      let UserBalanceCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceCache'),
        userBalanceCache = new UserBalanceCache({
          chainId: oThis.auxChainId,
          shardNumber: balanceShardMap[erc20Address],
          erc20Address: erc20Address,
          tokenHolderAddresses: tokenHolders
        });

      await userBalanceCache.clear();
    }
  }

  /**
   * Object of config strategy class
   *
   * @return {Object}
   *
   * @private
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) {
      return oThis.configStrategyObj;
    }

    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);

    return oThis.configStrategyObj;
  }

  /**
   * Config strategy
   *
   * @return {Object}
   *
   * @private
   */
  get _configStrategy() {
    const oThis = this;

    return oThis.ic().configStrategy;
  }
}

InstanceComposer.registerAsShadowableClass(BalanceCorrector, coreConstants.icNameSpace, 'BalanceCorrector');

module.exports = BalanceCorrector;
