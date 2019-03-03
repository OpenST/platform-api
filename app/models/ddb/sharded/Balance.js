'use strict';

const rootPrefix = '../../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  balanceConstants = require(rootPrefix + '/lib/globalConstant/balance'),
  util = require(rootPrefix + '/lib/util'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  errorConstant = require(rootPrefix + '/lib/globalConstant/error'),
  Base = require(rootPrefix + '/app/models/ddb/sharded/Base');

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const BigNumber = require('bignumber.js');

class Balance extends Base {
  /**
   *
   * @param {Object} params
   * @param {Number} params.consistentRead: (1,0)
   * @param {Number} params.shardNumber
   *
   * @constructor
   */
  constructor(params) {
    super(params);
  }

  /**
   * Mapping of long column names to their short names.
   *
   * @returns {{}}
   */
  get longToShortNamesMap() {
    const oThis = this;
    return balanceConstants.longNameToShortNameMap;
  }

  /**
   * Mapping of long column names to their short names.
   *
   * @returns {Object|*}
   */
  get shortToLongNamesMap() {
    const oThis = this;

    return util.invert(oThis.longToShortNamesMap);
  }

  /**
   * shortNameToDataType
   * @return {{}}
   */
  get shortNameToDataType() {
    return {
      tha: 'S',
      era: 'S',
      bsb: 'N',
      bud: 'N',
      psb: 'N',
      scb: 'N',
      ucb: 'N',
      uts: 'N'
    };
  }

  /**
   * Returns the table name template.
   *
   * @returns {String}
   */
  tableNameTemplate() {
    return '{{chainId}}_balances_{{shardNumber}}';
  }

  /**
   * Primary key of the table.
   *
   * @param params
   * @returns {Object}
   * @private
   */
  _keyObj(params) {
    const oThis = this,
      keyObj = {};

    let tokenHolderShortName = oThis.shortNameFor('tokenHolderAddress'),
      erc20AddressShortName = oThis.shortNameFor('erc20Address');

    keyObj[tokenHolderShortName] = {
      [oThis.shortNameToDataType[tokenHolderShortName]]: params['tokenHolderAddress'].toString()
    };
    keyObj[erc20AddressShortName] = {
      [oThis.shortNameToDataType[erc20AddressShortName]]: params['erc20Address'].toString()
    };

    return keyObj;
  }

  /**
   * Create table params
   *
   * @returns {Object}
   */
  tableSchema() {
    const oThis = this,
      tokenHolderShortName = oThis.shortNameFor('tokenHolderAddress'),
      erc20AddressShortName = oThis.shortNameFor('erc20Address');

    const tableSchema = {
      TableName: oThis.tableName(),
      KeySchema: [
        {
          AttributeName: erc20AddressShortName,
          KeyType: 'HASH'
        }, //Partition key
        {
          AttributeName: tokenHolderShortName,
          KeyType: 'RANGE'
        } //Sort key
      ],
      AttributeDefinitions: [
        { AttributeName: tokenHolderShortName, AttributeType: oThis.shortNameToDataType[tokenHolderShortName] },
        { AttributeName: erc20AddressShortName, AttributeType: oThis.shortNameToDataType[erc20AddressShortName] }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
      },
      SSESpecification: {
        Enabled: false
      }
    };

    return tableSchema;
  }

  /**
   * Settle balance record, create new record if not exist.
   *
   * @params {Object} params - Parameters
   * @param {String} params.tokenHolderAddress - User address for which balance has to be settled
   * @param {String} params.erc20Address - Token address with which user is associated with
   * @param {String<number>} params.blockChainSettledBalance - Amount to be settled on block chain. Give negative value to decrease, and positive to increase.
   * @param {String<number>} params.blockChainUnsettleDebits - Amount to settle in current transaction. Give negative value to decrease, and positive to increase.
   * @param {String<number>} params.creditSettledBalance - Amount to settle from credits. Give negative value to decrease, and positive to increase.
   * @param {String<number>} params.unSettledCreditAmount - Amount to settle from credits in current transaction. Give negative value to decrease, and positive to increase.
   *
   * @return {Promise<result>}
   */
  async updateBalance(params) {
    const oThis = this;

    let deltaBUD = params['blockChainUnsettleDebits'] || '0',
      deltaBSB = params['blockChainSettledBalance'] || '0',
      deltaCUD = params['creditUnSettledDebits'] || '0',
      deltaCSB = params['creditSettledBalance'] || '0',
      uts = basicHelper.timestampInSeconds().toString(10),
      zeroBn = new BigNumber(0);

    // New column = old column + delta(delta can be negative value)
    const deltaPessimisticChainBalance = new BigNumber(deltaBSB).minus(new BigNumber(deltaBUD)),
      deltaPessimisticCreditBalance = new BigNumber(deltaCSB).minus(new BigNumber(deltaCUD)),
      deltaPessimisticBalance = deltaPessimisticChainBalance.add(deltaPessimisticCreditBalance),
      totalUnsettledDebits = new BigNumber(deltaBUD).add(new BigNumber(deltaCUD));

    if (totalUnsettledDebits.gt(zeroBn)) {
      await oThis._checkBalanceFromCache(params.erc20Address, params.tokenHolderAddress, totalUnsettledDebits);
    }

    const balanceParams = {
      TableName: oThis.tableName(),
      Key: oThis._keyObj(params),
      UpdateExpression:
        'Add #blockChainUnsettledDebits :deltaBUD, #blockChainSettledBalance :deltaBSB ' +
        ', #pessimisticSettledBalance :deltaPessimisticBalance ' +
        ', #creditUnSettledDebits :deltaCUD, #creditSettledBalance :deltaCSB Set #uts = :uts',
      ExpressionAttributeNames: {
        '#blockChainUnsettledDebits': oThis.shortNameFor('blockChainUnsettleDebits'),
        '#blockChainSettledBalance': oThis.shortNameFor('blockChainSettledBalance'),
        '#pessimisticSettledBalance': oThis.shortNameFor('pessimisticSettledBalance'),
        '#creditUnSettledDebits': oThis.shortNameFor('creditUnSettledDebits'),
        '#creditSettledBalance': oThis.shortNameFor('creditSettledBalance'),
        '#uts': oThis.shortNameFor('updatedTimestamp')
      },
      ExpressionAttributeValues: {
        ':deltaBSB': { N: deltaBSB },
        ':deltaBUD': { N: deltaBUD },
        ':deltaCSB': { N: deltaCSB },
        ':deltaCUD': { N: deltaCUD },
        ':uts': { N: uts },
        ':deltaPessimisticBalance': { N: basicHelper.formatWeiToString(deltaPessimisticBalance) }
      },
      ReturnValues: 'NONE'
    };

    if (totalUnsettledDebits.gt(zeroBn)) {
      balanceParams['ConditionExpression'] = '#pessimisticSettledBalance >= :totalUnsettledDebits';
      balanceParams['ExpressionAttributeValues'][':totalUnsettledDebits'] = {
        N: basicHelper.formatWeiToString(totalUnsettledDebits)
      };
      balanceParams['ExpressionAttributeNames']['#pessimisticSettledBalance'] = oThis.shortNameFor(
        'pessimisticSettledBalance'
      );
    }

    const updateResponse = await oThis.ddbServiceObj.updateItem(balanceParams).catch(function(updateBalanceResponse) {
      if (updateBalanceResponse.internalErrorCode.endsWith(errorConstant.conditionalCheckFailedExceptionSuffix)) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: `a_m_d_dh_b_1:${errorConstant.insufficientFunds}`,
            api_error_identifier: 'something_went_wrong',
            debug_options: {
              totalUnsettledDebits: totalUnsettledDebits
            }
          })
        );
      }
      return updateBalanceResponse;
    });

    if (updateResponse.isFailure()) {
      return Promise.reject(updateResponse);
    }

    let methodInstance = oThis.subClass['afterUpdate'];
    let afterUpdateResponse = await methodInstance.apply(oThis.subClass, [oThis.ic(), params]);

    if (afterUpdateResponse.isFailure()) {
      logger.error('balanceCacheFlushError: ', balanceParams, afterUpdateResponse.toHash());
    }

    return updateResponse;
  }

  /**
   *
   * check if balance from cache is greater than totalUnsettledDebits
   *
   * @param {String} erc20Address
   * @param {String} tokenHolderAddress
   * @param {String} totalUnsettledDebits
   * @private
   */
  async _checkBalanceFromCache(erc20Address, tokenHolderAddress, totalUnsettledDebits) {
    const oThis = this;

    require(rootPrefix + '/lib/cacheManagement/chainMulti/Balance');
    let BalanceCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'BalanceCache'),
      balanceCache = new BalanceCache({
        tokenHolderAddresses: [tokenHolderAddress],
        erc20Address: erc20Address
      });
    let balanceFetchRsp = await balanceCache.fetch();
    if (balanceFetchRsp.isFailure()) {
      return balanceFetchRsp;
    }

    let pessimisticBalance = balanceFetchRsp.data[tokenHolderAddress]['pessimisticSettledBalance'];

    if (!pessimisticBalance || new BigNumber(pessimisticBalance).lt(totalUnsettledDebits)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: `a_m_d_dh_b_2:${errorConstant.insufficientFunds}`,
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            totalUnsettledDebits: totalUnsettledDebits,
            pessimisticBalance: pessimisticBalance
          }
        })
      );
    }
  }

  /**
   * Get balances for token holders
   *
   * @param params
   * @param params.tokenHolderAddresses - token holder addresses for which balances has to be fetched
   * @param params.erc20Address - token contract address
   *
   * @return {Promise<void>}
   */
  async getBalances(params) {
    const oThis = this;

    let keyObjArray = [];
    for (let index = 0; index < params['tokenHolderAddresses'].length; index++) {
      keyObjArray.push(
        oThis._keyObj({
          tokenHolderAddress: params.tokenHolderAddresses[index],
          erc20Address: params.erc20Address
        })
      );
    }
    return oThis.batchGetItem(keyObjArray, 'tokenHolderAddress');
  }

  /**
   * Method to perform extra formatting
   * @param dbRow
   * @return {*}
   * @private
   */
  _sanitizeRowFromDynamo(dbRow) {
    return dbRow;
  }

  /**
   *
   * Method to perform extra formatting
   *
   * @param dbRow
   * @return {Object}
   * @private
   */
  _sanitizeRowForDynamo(dbRow) {
    dbRow['tokenHolderAddress'] = basicHelper.sanitizeAddress(dbRow['tokenHolderAddress']);
    dbRow['erc20Address'] = basicHelper.sanitizeAddress(dbRow['erc20Address']);
    return dbRow;
  }

  /**
   * afterUpdate - Method to implement any after update actions
   *
   * @return {Promise<void>}
   */
  static async afterUpdate(ic, params) {
    require(rootPrefix + '/lib/cacheManagement/chainMulti/Balance');
    let BalanceCache = ic.getShadowedClassFor(coreConstants.icNameSpace, 'BalanceCache'),
      balanceCache = new BalanceCache({
        tokenHolderAddresses: [params.tokenHolderAddress],
        erc20Address: params.erc20Address
      });
    await balanceCache.clear();

    logger.debug('Balance related caches cleared.', params);
    return responseHelper.successWithData({});
  }

  /**
   * Subclass to return its own class here
   *
   * @returns {object}
   */
  get subClass() {
    return Balance;
  }
}

InstanceComposer.registerAsShadowableClass(Balance, coreConstants.icNameSpace, 'BalanceModel');

module.exports = {};
