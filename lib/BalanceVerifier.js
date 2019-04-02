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
  BATCH_SIZE = 100,
  transactionsString = '_transactions',
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

    oThis.finalizeQueryTimeStamp = params.timeStamp;
    oThis.nonFinalizeQueryTimeStamp = currentTime - finalizationWaitTimeInSecs;

    oThis.timeStamp = params.timeStamp;
    oThis.nextTimeStamp = currentTime - finalizationWaitTimeInSecs;

    oThis.lastCreatedTime = oThis.nextTimeStamp;
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
      dataToReturn = responseHelper.successWithData({
        timeStamp: oThis.nextTimeStamp,
        noOfTxFound: oThis.esSearchData.length
      });

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

    return responseHelper.successWithData({ timeStamp: oThis.lastCreatedTime, noOfTxFound: oThis.esSearchData.length });
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
      resultType = oThis.auxChainId + transactionsString;

    const esService = new ESTransactionService(oThis.esConfig),
      esQuery = oThis._getQueryObject(oThis.timeStamp);

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
      if (paginatedEsSearchResponse.isFailure() || !paginatedEsSearchResponse.data[resultType]) {
        logger.error('BalanceVerifier Es paginatedEsSearchResponse----', paginatedEsSearchResponse);
        break;
      }
      oThis.esSearchData = oThis.esSearchData.concat(paginatedEsSearchResponse.data[resultType]);
      esSearchResponse = paginatedEsSearchResponse;
    }

    oThis.esSearchData = [...new Set(oThis.esSearchData)]; // Removes duplication.
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
      const transactionData = oThis.esSearchData[index];
      if (!transactionData) {
        continue;
      }

      const userAddressesString = transactionData.user_addresses_status,
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
            oThis.lastCreatedTime = transactionData.created_at;
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

      // make address array unique.
      oThis.tokenIdToUserAddressesMap[tokenId] = [...new Set(oThis.tokenIdToUserAddressesMap[tokenId])];
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

    oThis.userAddrToErc20Map = {};

    for (const tokenId in oThis.tokenIdToUserAddressesMap) {
      const userAddresses = oThis.tokenIdToUserAddressesMap[tokenId],
        UserBalanceCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceCache'),
        userBalanceCache = new UserBalanceCache({
          chainId: oThis.auxChainId,
          erc20Address: oThis.tokenIdToErc20AddressesMap[tokenId],
          tokenHolderAddresses: userAddresses
        });

      for (let i = 0; i < userAddresses.length; i++) {
        oThis.userAddrToErc20Map[userAddresses[i]] = oThis.tokenIdToErc20AddressesMap[tokenId];
      }

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

    let {
      finalMismatchAddresses,
      finalUnsettledDebitsNotZeroAddresses,
      finalSettledBalanceMismatchAddresses
    } = await oThis.getFinalMismatchAddresses(
      pessimisticSettledBalanceMismatchAddresses,
      unsettledDebitsNotZeroAddresses,
      settledBalanceMismatchAddresses
    );

    if (
      finalUnsettledDebitsNotZeroAddresses.length ||
      finalSettledBalanceMismatchAddresses.length ||
      finalMismatchAddresses.length
    ) {
      const debugOptions = {
          unsettledDebitsNotZeroAddresses: finalUnsettledDebitsNotZeroAddresses,
          settledBalanceMismatchAddresses: finalSettledBalanceMismatchAddresses,
          pessimisticSettledBalanceMismatchAddresses: finalMismatchAddresses
        },
        errorObject = responseHelper.error({
          internal_error_identifier: 'balance_verifier_balance_mismatch:l_bv_1',
          api_error_identifier: 'balance_verifier_balance_mismatch',
          debug_options: debugOptions
        });

      let balanceCorrectionMap = {};

      for (let i = 0; i < finalUnsettledDebitsNotZeroAddresses.length; i++) {
        let erc20Address = oThis.userAddrToErc20Map[finalUnsettledDebitsNotZeroAddresses[i]];

        if (balanceCorrectionMap.hasOwnProperty(erc20Address)) {
          balanceCorrectionMap[erc20Address].push(finalUnsettledDebitsNotZeroAddresses[i]);
        } else {
          balanceCorrectionMap[erc20Address] = [finalUnsettledDebitsNotZeroAddresses[i]];
        }
      }

      for (let i = 0; i < finalSettledBalanceMismatchAddresses.length; i++) {
        let erc20Address = oThis.userAddrToErc20Map[finalSettledBalanceMismatchAddresses[i]];

        if (balanceCorrectionMap.hasOwnProperty(erc20Address)) {
          balanceCorrectionMap[erc20Address].push(finalSettledBalanceMismatchAddresses[i]);
        } else {
          balanceCorrectionMap[erc20Address] = [finalSettledBalanceMismatchAddresses[i]];
        }
      }

      for (let i = 0; i < finalMismatchAddresses.length; i++) {
        let erc20Address = oThis.userAddrToErc20Map[finalMismatchAddresses[i]];

        if (balanceCorrectionMap.hasOwnProperty(erc20Address)) {
          balanceCorrectionMap[erc20Address].push(finalMismatchAddresses[i]);
        } else {
          balanceCorrectionMap[erc20Address] = [finalMismatchAddresses[i]];
        }
      }

      console.error('===Use below map for correction\n', balanceCorrectionMap);

      //await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.lowSeverity);
    }
  }

  /**
   * Get final addresses for which alert has to be sent
   *
   * @param pessimisticSettledBalanceMismatchAddresses
   * @param settledBalanceMismatchAddresses
   * @param unsettledDebitsNotZeroAddresses
   * @return {Promise<{}>}
   */
  async getFinalMismatchAddresses(
    pessimisticSettledBalanceMismatchAddresses,
    settledBalanceMismatchAddresses,
    unsettledDebitsNotZeroAddresses
  ) {
    const oThis = this;

    let addressesToCheck = [];
    addressesToCheck = addressesToCheck.concat(pessimisticSettledBalanceMismatchAddresses);
    addressesToCheck = addressesToCheck.concat(settledBalanceMismatchAddresses);
    addressesToCheck = addressesToCheck.concat(unsettledDebitsNotZeroAddresses);

    addressesToCheck = [...new Set(addressesToCheck)]; // Removes duplicates

    logger.info('====addressesToCheck length', addressesToCheck.length);

    let offset = 0;
    let batchNo = 1;
    while (true) {
      let addressSubArray = addressesToCheck.slice(offset, offset + BATCH_SIZE);
      offset = offset + BATCH_SIZE;

      batchNo += 1;

      if (addressSubArray.length == 0) break;

      logger.info('====batchNo', batchNo - 1);

      await oThis._getNonFinalizedData(oThis.nonFinalizeQueryTimeStamp, addressSubArray);
    }

    // Consider addresses from above query to be ignored
    let addressToIgnore = new Set();

    logger.info('====Result count of non-finalized data query', oThis.esSearchData.length);

    for (let i = 0; i < oThis.esSearchData.length; i++) {
      const transactionData = oThis.esSearchData[i];
      if (!transactionData) {
        continue;
      }

      let userAddressesString = transactionData['user_addresses_status'],
        userAddresses = userAddressesString.split(' ');

      for (let j = 0; j < userAddresses.length; j++) {
        addressToIgnore.add(userAddresses[j]);
      }
    }

    // Remove the ignored addresses from respective arrays
    let finalMismatchAddresses = [],
      finalUnsettledDebitsNotZeroAddresses = [],
      finalSettledBalanceMismatchAddresses = [];

    for (let i = 0; i < pessimisticSettledBalanceMismatchAddresses.length; i++) {
      if (!addressToIgnore.has(pessimisticSettledBalanceMismatchAddresses[i])) {
        finalMismatchAddresses.push(pessimisticSettledBalanceMismatchAddresses[i]);
      }
    }

    for (let i = 0; i < unsettledDebitsNotZeroAddresses.length; i++) {
      if (!addressToIgnore.has(unsettledDebitsNotZeroAddresses[i])) {
        finalUnsettledDebitsNotZeroAddresses.push(unsettledDebitsNotZeroAddresses[i]);
      }
    }

    for (let i = 0; i < settledBalanceMismatchAddresses.length; i++) {
      if (!addressToIgnore.has(settledBalanceMismatchAddresses[i])) {
        finalSettledBalanceMismatchAddresses.push(settledBalanceMismatchAddresses[i]);
      }
    }

    return { finalMismatchAddresses, finalUnsettledDebitsNotZeroAddresses, finalSettledBalanceMismatchAddresses };
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
  _getQueryObject(timestamp) {
    const oThis = this;

    return {
      query: {
        range: {
          created_at: {
            gte: timestamp
          }
        }
      },
      from: 0
    };
  }

  /**
   * Get query object.
   *
   * @returns {*}
   *
   * @private
   */
  _ignoreDataQuery(timestamp, addresses) {
    let queryString = '';

    for (let i = 0; i < addresses.length; i++) {
      queryString += ' f-' + addresses[i] + ' OR t-' + addresses[i] + ' ';
    }

    queryString = '( ' + queryString + ' )';

    return {
      query: {
        bool: {
          must: [
            {
              query_string: {
                default_field: 'user_addresses_status',
                query: queryString
              }
            },
            {
              range: {
                created_at: {
                  gte: timestamp
                }
              }
            }
          ]
        }
      },
      from: 0
    };
  }

  /**
   * Ignore non finalized data
   *
   * @returns {*}
   *
   * @private
   */
  async _getNonFinalizedData(queryTimestamp, addresses) {
    const oThis = this,
      resultType = oThis.auxChainId + transactionsString;

    const esService = new ESTransactionService(oThis.esConfig),
      esQuery = oThis._ignoreDataQuery(queryTimestamp, addresses);

    let esSearchResponse = await esService.search(esQuery);

    if (esSearchResponse.isFailure()) {
      return esSearchResponse;
    }
    oThis.esSearchData = esSearchResponse.data[resultType];

    if (oThis.esSearchData.length === 0) return;

    while (esSearchResponse.data && esSearchResponse.data.meta && esSearchResponse.data.meta.has_next_page) {
      esQuery.from = esSearchResponse.data.meta.next_page_payload.from;

      const paginatedEsSearchResponse = await esService.search(esQuery);
      if (paginatedEsSearchResponse.isFailure() || !paginatedEsSearchResponse.data[resultType]) {
        logger.error('BalanceVerifier Es paginatedEsSearchResponse----', paginatedEsSearchResponse);
        break;
      }
      oThis.esSearchData = oThis.esSearchData.concat(paginatedEsSearchResponse.data[resultType]);
      esSearchResponse = paginatedEsSearchResponse;
    }

    oThis.esSearchData = [...new Set(oThis.esSearchData)]; // Removes duplication.
    logger.log('Es search response ', oThis.esSearchData);
  }
}

InstanceComposer.registerAsShadowableClass(BalanceVerifier, coreConstants.icNameSpace, 'BalanceVerifier');

module.exports = {};
