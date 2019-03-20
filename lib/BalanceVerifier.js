/**
 * Class for verifying balance
 *
 * @module lib/BalanceVerifier
 */

const OSTBase = require('@ostdotcom/base'),
  BigNumber = require('bignumber.js');

const rootPrefix = '..',
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  getUbtBalance = require(rootPrefix + '/lib/getBalance/Ubt'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  esServices = require(rootPrefix + '/lib/elasticsearch/manifest'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy');

const InstanceComposer = OSTBase.InstanceComposer,
  ESTransactionService = esServices.services.transactions;

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/chainMulti/Balance');

const finalizationWaitTimeInSecs = 300, // 5 minutes in sec
  currentTime = Math.floor(Date.now() / 1000);

/**
 * Class for balance verifier.
 *
 * @class BalanceVerifier
 */
class BalanceVerifier {
  /**
   * Constructor for balance verifier.
   *
   * @param {Object} params
   * @param {Number} params.timeStamp: Start time from where transactions would be looked up.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.timeStamp = params.timeStamp;
    oThis.nextTimeStamp = currentTime - finalizationWaitTimeInSecs;

    oThis.esConfig = {};
    oThis.esSearchData = [];
    oThis.tokenIdToUserAddressesMap = {};
    oThis.tokenIds = [];
    oThis.tokenIdToErc20AddressesMap = {};
    oThis.finalizedUserAddresses = new Set();
    oThis.notFinalizedUserAddresses = new Set();
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
    const oThis = this,
      promiseArray = [],
      dataToReturn = responseHelper.successWithData({ timeStamp: oThis.nextTimeStamp });

    if (oThis.timeStamp > oThis.nextTimeStamp) {
      logger.info('Passed timestamp is greater than current time minus finalization wait time(5 mins). ');

      return dataToReturn;
    }

    await oThis._getEsConfig();

    await oThis._getDataFromEs();

    if (oThis.esSearchData.length === 0) {
      logger.info('No transactions found. ');

      return dataToReturn;
    }

    await oThis._getUserAddresses();

    if (basicHelper.isEmptyObject(oThis.tokenIdToUserAddressesMap)) {
      return dataToReturn;
    }

    await oThis._getErc20Addresses();

    promiseArray.push(oThis._getBalanceFromGeth());
    promiseArray.push(oThis._getBalanceFromDdb());
    await Promise.all(promiseArray);

    await oThis._verifyBalance();

    return dataToReturn;
  }

  /**
   * Get es config.
   *
   * @private
   */
  _getEsConfig() {
    const oThis = this;

    const configStrategy = oThis._configStrategyObject,
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
    const oThis = this,
      transactionsString = '_transactions',
      resultType = oThis.auxChainId + transactionsString;

    const esService = new ESTransactionService(oThis.esConfig),
      esQuery = oThis._getQueryObject();

    let esSearchResponse = await esService.search(esQuery);

    if (esSearchResponse.isFailure()) {
      oThis.nextTimeStamp = oThis.timeStamp;
      return;
    }
    oThis.esSearchData = esSearchResponse.data[resultType];

    if (oThis.esSearchData.length === 0) return;

    while (esSearchResponse.data && esSearchResponse.data.meta && esSearchResponse.data.meta.has_next_page) {
      esQuery.from = esSearchResponse.data.meta.next_page_payload.from;

      const paginatedEsSearchResponse = await esService.search(esQuery);

      oThis.esSearchData = oThis.esSearchData.concat(paginatedEsSearchResponse.data[resultType]);
      oThis.esSearchData = [...new Set(oThis.esSearchData)]; // Removes duplication.

      esSearchResponse = paginatedEsSearchResponse;
    }
    logger.log('Es search response ', oThis.esSearchData);
  }

  /**
   * Get user addresses from es search data.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _getUserAddresses() {
    const oThis = this;

    for (let index = 0; index < oThis.esSearchData.length; index++) {
      const transactionData = oThis.esSearchData[index],
        userAddressesString = transactionData.user_addresses_status,
        userAddresses = userAddressesString.split(' '),
        tokenId = transactionData.token_id;

      oThis.tokenIds.push(tokenId);

      for (let userAddressesIndex = 0; userAddressesIndex < userAddresses.length; userAddressesIndex++) {
        const userAddr = userAddresses[userAddressesIndex].match('0x.*');

        if (userAddr) {
          if (transactionData.created_at < oThis.nextTimeStamp) {
            oThis.finalizedUserAddresses.add(userAddr[0]);
            oThis.tokenIdToUserAddressesMap[tokenId] = oThis.tokenIdToUserAddressesMap[tokenId] || [];
            oThis.tokenIdToUserAddressesMap[tokenId].push(userAddr[0]);
          } else {
            oThis.notFinalizedUserAddresses.add(userAddr[0]);
          }
        }
      }
    }

    console.log('Finalized user addresses: ', oThis.finalizedUserAddresses);
    console.log('Not finalized user addresses: ', oThis.notFinalizedUserAddresses);
    console.log('Token id to user addresses map: ', oThis.tokenIdToUserAddressesMap);
  }

  /**
   * Get utility branded token contract addresses for tokenId.
   *
   * @private
   */
  async _getErc20Addresses() {
    const oThis = this;

    for (let index = 0; index < oThis.tokenIds.length; index++) {
      const tokenId = oThis.tokenIds[index],
        getAddrRsp = await new TokenAddressCache({
          tokenId: tokenId
        }).fetch();

      if (getAddrRsp.isFailure()) {
        return Promise.reject(getAddrRsp);
      }

      oThis.tokenIdToErc20AddressesMap[tokenId] = getAddrRsp.data[tokenAddressConstants.utilityBrandedTokenContract];
    }

    logger.debug('Token id to erc20 addresses map: ', oThis.tokenIdToErc20AddressesMap);
  }

  /**
   * Get balance from geth.
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _getBalanceFromGeth() {
    const oThis = this,
      promiseArray = [];

    for (const tokenId in oThis.tokenIdToUserAddressesMap) {
      const userAddresses = oThis.tokenIdToUserAddressesMap[tokenId];

      promiseArray.push(
        new getUbtBalance({
          auxChainId: oThis.auxChainId,
          tokenId: tokenId,
          addresses: userAddresses
        })
          .perform()
          .then(function(response) {
            Object.assign(oThis.userAddrToGethBalanceMap, response);
          })
          .catch(function(error) {
            logger.error('Error while fetching balance from geth: ', error);
          })
      );
    }
    await Promise.all(promiseArray);
  }

  /**
   * Get balance from ddb table.
   *
   * @returns {Promise<*>}
   *
   * @private
   */
  async _getBalanceFromDdb() {
    const oThis = this,
      promiseArray = [];

    for (const tokenId in oThis.tokenIdToUserAddressesMap) {
      const userAddresses = oThis.tokenIdToUserAddressesMap[tokenId],
        UserBalanceCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceCache'),
        userBalanceCache = new UserBalanceCache({
          chainId: oThis.auxChainId,
          erc20Address: oThis.tokenIdToErc20AddressesMap[tokenId],
          tokenHolderAddresses: userAddresses
        });

      promiseArray.push(
        userBalanceCache
          .fetch()
          .then(function(resp) {
            if (resp.isSuccess()) {
              Object.assign(oThis.userAddrToDdbBalancesMap, resp.data);
            }
          })
          .catch(function(err) {
            logger.error('Error occured in while fetching balance from dynamo db: ', err);
          })
      );
    }
    await Promise.all(promiseArray);
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

    if (
      basicHelper.isEmptyObject(oThis.userAddrToDdbBalancesMap) ||
      basicHelper.isEmptyObject(oThis.userAddrToGethBalanceMap)
    ) {
      logger.error('Balance not available for ddb or geth.');

      return;
    }

    for (const address of oThis.finalizedUserAddresses) {
      // Do nothing if current user address is also present in not finalized user address map.
      if (!oThis.notFinalizedUserAddresses.has(address)) {
        const ddbBalance = oThis.userAddrToDdbBalancesMap[address] || 0,
          gethBalance = oThis.userAddrToGethBalanceMap[address] || 0,
          blockChainUnsettleDebits = ddbBalance.blockChainUnsettleDebits || 0,
          blockChainSettledBalance = ddbBalance.blockChainSettledBalance || 0,
          pessimisticSettledBalance = ddbBalance.pessimisticSettledBalance || 0,
          blockChainUnsettleDebitsBn = new BigNumber(blockChainUnsettleDebits),
          blockChainSettledBalanceBn = new BigNumber(blockChainSettledBalance),
          pessimisticSettledBalanceBn = new BigNumber(pessimisticSettledBalance),
          gethBalanceBn = new BigNumber(gethBalance),
          zeroBigNumber = new BigNumber(0);

        // BlockChainUnsettleDebits should be equal to zero.
        if (!zeroBigNumber.equals(blockChainUnsettleDebitsBn)) {
          unsettledDebitsNotZeroAddresses.push(address);
        }

        // Balance on geth should be equal to blockChain settled balance.
        if (!gethBalanceBn.equals(blockChainSettledBalanceBn)) {
          settledBalanceMismatchAddresses.push(address);
        }

        if (!pessimisticSettledBalanceBn.equals(blockChainSettledBalanceBn.minus(blockChainUnsettleDebitsBn))) {
          pessimisticSettledBalanceMismatchAddresses.push(address);
        }
      }
    }

    if (
      unsettledDebitsNotZeroAddresses.length ||
      settledBalanceMismatchAddresses.length ||
      pessimisticSettledBalanceMismatchAddresses.length
    ) {
      const debugOptions = {
          unsettledDebitsNotZeroAddresses: unsettledDebitsNotZeroAddresses,
          settledBalanceMismatchAddresses: settledBalanceMismatchAddresses,
          pessimisticSettledBalanceMismatchAddresses: pessimisticSettledBalanceMismatchAddresses
        },
        errorObject = responseHelper.error({
          internal_error_identifier: 'balance_verifier_balance_mismatch:l_bv_1:',
          api_error_identifier: 'balance_verifier_balance_mismatch',
          debug_options: debugOptions
        });

      await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.lowSeverity);
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
      },
      from: 0
    };
  }
}

InstanceComposer.registerAsShadowableClass(BalanceVerifier, coreConstants.icNameSpace, 'BalanceVerifier');

module.exports = {};
