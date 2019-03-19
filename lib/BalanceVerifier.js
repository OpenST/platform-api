/**
 * Class for verifying balance
 *
 * @module lib/BalanceVerifier
 */

const OSTBase = require('@ostdotcom/base'),
  BigNumber = require('bignumber.js');

const rootPrefix = '..',
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  getUbtBalance = require(rootPrefix + '/lib/getBalance/Ubt'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  esServices = require(rootPrefix + '/lib/elasticsearch/manifest'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

const InstanceComposer = OSTBase.InstanceComposer,
  ESTransactionService = esServices.services.transactions;

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/Balance');

const safeTimeStamp = 1500;

/**
 *
 * @class
 */
class BalanceVerifier {
  constructor(params) {
    const oThis = this;
    oThis.timeStamp = params.timeStamp;
    oThis.nextTimeStamp = oThis.timeStamp + safeTimeStamp;

    oThis.esConfig = {};
    oThis.tokenIdToUserAddressesMap = {};
    oThis.tokenIds = [];
    oThis.tokenIdToErc20AddressesMap = {};
    oThis.finalizedUserAddresses = null;
    oThis.notFinalizedUserAddresses = null;
    oThis.configStrategyObj = null;
    oThis.userAddrToDdbBalancesMap = {};
    oThis.userAddrToGethBalanceMap = {};
  }

  /**
   * Main performer method.
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._getEsConfig();

    await oThis._getDataFromEs();

    await oThis._getUserAddresses();

    await oThis._getBalanceFromGeth();

    await oThis._getErc20Addresses();

    await oThis._getBalanceFromDdb();

    await oThis._verifyBalance();

    return responseHelper.successWithData({ timeStamp: oThis.nextTimeStamp });
  }

  /**
   * Get es config.
   *
   * @private
   */
  _getEsConfig() {
    const oThis = this;

    let configStrategy = oThis._configStrategyObject,
      esConfig = configStrategy.elasticSearchConfig,
      elasticSearchKey = configStrategyConstants.elasticSearch;

    oThis.auxChainId = configStrategy.auxChainId;

    oThis.esConfig.chainId = oThis.auxChainId;
    oThis.esConfig[elasticSearchKey] = esConfig;
  }

  /**
   * Get data from es.
   *
   * @private
   */
  async _getDataFromEs() {
    const oThis = this;

    let esService = new ESTransactionService(oThis.esConfig),
      esQuery = oThis._getQueryObject();

    oThis.esSearchResponse = await esService.search(esQuery);

    logger.log('Es search response ', oThis.esSearchResponse);
  }

  /**
   * Get user addresses from es search data.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _getUserAddresses() {
    const oThis = this,
      esSearchData = oThis.esSearchResponse.data[oThis.auxChainId + '_transactions'];
    oThis.finalizedUserAddresses = new Set();
    oThis.notFinalizedUserAddresses = new Set();

    if (!esSearchData.length) return;

    for (let index = 0; index < esSearchData.length; index++) {
      let transactionData = esSearchData[index],
        userAddressesString = transactionData.user_addresses_status,
        userAddresses = userAddressesString.split(' '),
        tokenId = transactionData.token_id;

      oThis.tokenIds.push(tokenId);

      for (let i = 0; i < userAddresses.length; i++) {
        let userAddr = userAddresses[i].match('0x.*');

        if (userAddr) {
          if (transactionData.created_at < oThis.nextTimeStamp) {
            oThis.finalizedUserAddresses.add(userAddr[0]);
          } else {
            oThis.notFinalizedUserAddresses.add(userAddr[0]);
          }

          oThis.tokenIdToUserAddressesMap[tokenId] = oThis.tokenIdToUserAddressesMap[tokenId] || [];
          oThis.tokenIdToUserAddressesMap[tokenId].push(userAddr[0]);
        }
      }
    }

    console.log('oThis.finalizedUserAddresses', oThis.finalizedUserAddresses);
    console.log('oThis.notFinalizedUserAddresses', oThis.notFinalizedUserAddresses);
    console.log('oThis.tokenIdToUserAddressesMap', oThis.tokenIdToUserAddressesMap);
  }

  /**
   * Get balance from ddb table.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _getBalanceFromDdb() {
    const oThis = this;

    for (let tokenId in oThis.tokenIdToUserAddressesMap) {
      let userAddresses = oThis.tokenIdToUserAddressesMap[tokenId],
        UserBalanceCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceCache'),
        userBalanceCache = new UserBalanceCache({
          chainId: oThis.auxChainId,
          erc20Address: oThis.tokenIdToErc20AddressesMap[tokenId],
          tokenHolderAddresses: userAddresses
        });

      let fetchBalanceRsp = await userBalanceCache.fetch();

      if (fetchBalanceRsp.isFailure()) {
        return Promise.reject(fetchBalanceRsp);
      }
      Object.assign(oThis.userAddrToDdbBalancesMap, fetchBalanceRsp.data);
    }
    logger.log('=== oThis.userAddrToDdbBalancesMap ===', oThis.userAddrToDdbBalancesMap);
  }

  /**
   * Verify balance.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _verifyBalance() {
    const oThis = this,
      unsettledDebitsNotZeroAddresses = [],
      settledBalanceMismatchAddresses = [],
      pessimisticSettledBalanceMismatchAddresses = [];

    for (let address of oThis.finalizedUserAddresses) {
      let finalizedUserAddr = address;

      // Do nothing if current user address is also present in not finalized user address map.
      if (!oThis.notFinalizedUserAddresses.has(finalizedUserAddr)) {
        let ddbBalance = oThis.userAddrToDdbBalancesMap[finalizedUserAddr],
          gethBalance = oThis.userAddrToGethBalanceMap[finalizedUserAddr],
          blockChainUnsettleDebits = new BigNumber(ddbBalance.blockChainUnsettleDebits),
          blockChainSettledBalance = new BigNumber(ddbBalance.blockChainSettledBalance),
          pessimisticSettledBalance = new BigNumber(ddbBalance.pessimisticSettledBalance);

        // blockChainUnsettleDebits should be equal to zero.
        if (!new BigNumber(0).equals(blockChainUnsettleDebits)) {
          unsettledDebitsNotZeroAddresses.push(address);
        }

        // Balance on geth should be equal to blockChain settled balance.
        if (!new BigNumber(gethBalance).equals(blockChainSettledBalance)) {
          settledBalanceMismatchAddresses.push(address);
        }

        if (!pessimisticSettledBalance.equals(blockChainSettledBalance.minus(blockChainUnsettleDebits))) {
          pessimisticSettledBalanceMismatchAddresses.push(address);
        }
      }
    }

    logger.debug('unsettledDebitsNotZeroAddresses', unsettledDebitsNotZeroAddresses);
    logger.debug('settledBalanceMismatchAddresses', settledBalanceMismatchAddresses);
    logger.debug('pessimisticSettledBalanceMismatchAddresses', pessimisticSettledBalanceMismatchAddresses);

    if (
      unsettledDebitsNotZeroAddresses.length ||
      settledBalanceMismatchAddresses.length ||
      pessimisticSettledBalanceMismatchAddresses.length
    ) {
      logger.error(' Mismatch in balances occured');
      logger.error(' unsettledDebitsNotZeroAddresses', unsettledDebitsNotZeroAddresses);
      logger.error(' settledBalanceMismatchAddresses', settledBalanceMismatchAddresses);
      logger.error(' pessimisticSettledBalanceMismatchAddresses', pessimisticSettledBalanceMismatchAddresses);
    }
  }

  /***
   * Get utility branded token contract addresses for tokenId.
   *
   * @private
   */
  async _getErc20Addresses() {
    const oThis = this;

    for (let i = 0; i < oThis.tokenIds.length; i++) {
      let tokenId = oThis.tokenIds[i],
        getAddrRsp = await new TokenAddressCache({
          tokenId: tokenId
        }).fetch();

      if (getAddrRsp.isFailure()) {
        return Promise.reject(getAddrRsp);
      }

      oThis.tokenIdToErc20AddressesMap[tokenId] = getAddrRsp.data[tokenAddressConstants.utilityBrandedTokenContract];
    }

    logger.debug('oThis.tokenIdToErc20AddressesMap ===', oThis.tokenIdToErc20AddressesMap);
  }

  /**
   * Get balance from geth.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _getBalanceFromGeth() {
    const oThis = this;

    for (let tokenId in oThis.tokenIdToUserAddressesMap) {
      let userAddresses = oThis.tokenIdToUserAddressesMap[tokenId],
        ubtbalances = await new getUbtBalance({
          auxChainId: oThis.auxChainId,
          tokenId: tokenId,
          addresses: userAddresses
        }).perform();

      Object.assign(oThis.userAddrToGethBalanceMap, ubtbalances);
    }
    logger.debug('oThis.userAddrToGethBalanceMap', oThis.userAddrToGethBalanceMap);
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

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

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

  /**
   * Get query object.
   *
   * @returns {*}
   *
   * @private
   */
  _getQueryObject() {
    const oThis = this;

    return {
      query: {
        range: {
          created_at: {
            gte: oThis.timeStamp
          }
        }
      }
    };
  }

  /**
   * Get cron kind.
   */
  get getCronKind() {
    const oThis = this;
    oThis.cronKind = cronProcessesConstants.balanceVerifier;
  }
}

InstanceComposer.registerAsShadowableClass(BalanceVerifier, coreConstants.icNameSpace, 'BalanceVerifier');

module.exports = {};
