'use strict';
/**
 * This service helps in fetching transactions of a user
 *
 * @module app/services/transaction/get/TransactionsList
 */
const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  ESConstants = require(rootPrefix + '/lib/elasticsearch/config/constants'),
  GetTransactionBase = require(rootPrefix + '/app/services/transaction/get/Base'),
  GetTransactionDetails = require(rootPrefix + '/lib/transactions/GetTransactionDetails'),
  pendingTransactionConstant = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  esServices = require(rootPrefix + '/lib/elasticsearch/manifest'),
  esQueryFormatter = require(rootPrefix + '/lib/elasticsearch/helpers/queryFormatter'),
  ESTransactionService = esServices.services.transactions;

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');
require(rootPrefix + '/lib/transactions/GetTransactionDetails');
/**
 * Class to Get User transactions
 *
 * @class
 */
class GetTransactionsList extends GetTransactionBase {
  /**
   * Constructor for execute transaction
   *
   * @param params
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;

    oThis.status = params.status;
    oThis.limit = params.limit;
    oThis.metaProperty = params.meta_property;
    oThis.paginationIdentifier = params[pagination.paginationIdentifierKey];

    oThis.auxChainId = null;
    oThis.transactionDetails = {};
    oThis.integerStatuses = [];

    oThis.responseMetaData = {
      [pagination.nextPagePayloadKey]: {}
    };
  }

  /**
   * Main performer method.
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    // Parse pagination.
    oThis._validateAndSanitizeParams();

    let GetTransactionDetails = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'GetTransactionDetails'),
      userCacheResponse = await oThis._fetchUserFromCache(),
      userCacheResponseData = userCacheResponse.data[oThis.userId],
      tokenHolderAddress = userCacheResponseData.tokenHolderAddress;

    if (basicHelper.isEmptyObject(userCacheResponseData) || !tokenHolderAddress) {
      return responseHelper.paramValidationError({
        internal_error_identifier: 'a_s_t_g_tl_1',
        api_error_identifier: 'resource_not_found',
        params_error_identifiers: ['invalid_user_id'],
        debug_options: {}
      });
    }

    const serviceConfig = oThis._getServiceConfig(),
      service = new ESTransactionService(serviceConfig),
      esQuery = oThis._getElasticSearchQuery(tokenHolderAddress);

    esQuery['size'] = oThis.limit;
    esQuery['from'] = oThis.from;

    let userTransactions = await service.search(esQuery);

    if (userTransactions.isSuccess() && userTransactions.data[oThis.auxChainId + '_transactions'].length !== 0) {
      oThis._setMeta(userTransactions.data);

      let response = await new GetTransactionDetails({
        chainId: oThis.auxChainId,
        esSearchData: userTransactions
      }).perform();

      if (response.isSuccess()) {
        oThis.transactionDetails = response.data;
      }
    }

    return oThis._formatApiResponse();
  }

  /**
   * Validate and sanitize input parameters.
   *
   * @returns {*}
   *
   * @private
   */
  async _validateAndSanitizeParams() {
    const oThis = this;

    // Parameters in paginationIdentifier take higher precedence
    if (oThis.paginationIdentifier) {
      let parsedPaginationParams = oThis._parsePaginationParams(oThis.paginationIdentifier);
      oThis.status = parsedPaginationParams.status; //override status
      oThis.metaProperty = parsedPaginationParams.meta_property; //override meta_property
      oThis.limit = parsedPaginationParams.limit; //override limit
      oThis.from = parsedPaginationParams.from; //override from
    } else {
      oThis.status = oThis.status || [];
      oThis.metaProperty = oThis.metaProperty || [];
      oThis.limit = oThis.limit || oThis._defaultPageLimit();
      oThis.from = 0;
    }

    // Validate status
    await oThis._validateAndSanitizeStatus();

    //Validate limit
    return oThis._validatePageSize();
  }

  /**
   * Status validations
   *
   * @returns {Promise<void>}
   * @private
   */
  async _validateAndSanitizeStatus() {
    const oThis = this,
      validStatuses = pendingTransactionConstant.invertedStatuses;

    let currStatusInt;

    for (let i = 0; i < oThis.status.length; i++) {
      currStatusInt = validStatuses[oThis.status[i]];
      if (!currStatusInt) {
        return Promise.reject(
          responseHelper.paramValidationError({
            internal_error_identifier: 'a_s_t_g_tl_2',
            api_error_identifier: 'invalid_api_params',
            params_error_identifiers: ['invalid_status'],
            debug_options: {}
          })
        );
      } else {
        oThis.integerStatuses.push(currStatusInt);
      }
    }
  }

  /**
   * Get elastic search query.
   *
   * @input tokenHolderAddress
   * @return Object <Service config>
   *
   * Eg finalConfig = {
   *   query: {
   *     query_string: {
   *        default_field : "user_addresses_status" OR  fields: ['user_addresses_status', 'meta'] if meta present,
   *        query: '( f-0x4e13fc4e514ea40cb3783cfaa4d876d49034aa18 OR t-0x33533531C09EC51D6505EAeA4A17D7810aF1DcF5924A99 ) AND ( n=transaction_name AND t=user_to_user ) AND ( 0 OR 1 )'
   *     }
   *   }
   * }
   * @private
   **/

  _getElasticSearchQuery(tokenHolderAddress) {
    const oThis = this,
      addressQueryString = oThis.getUserAddressQueryString(tokenHolderAddress),
      statusQueryString = oThis.getStatusQueryString(),
      metaQueryString = oThis.getMetaQueryString(),
      queryFieldKey = metaQueryString ? 'fields' : 'default_field';

    let queryObject = oThis.getQueryObject(),
      queryBody = queryObject['query']['query_string'],
      esQueryVals = [addressQueryString],
      esQuery;

    if (queryFieldKey == 'fields') {
      queryBody[queryFieldKey] = [ESConstants.userAddressesOutKey, ESConstants.metaOutKey];
    } else {
      queryBody[queryFieldKey] = ESConstants.userAddressesOutKey;
    }

    if (statusQueryString) {
      esQueryVals.push(statusQueryString);
    }

    if (metaQueryString) {
      esQueryVals.push(metaQueryString);
    }

    esQuery = esQueryFormatter.getAndQuery(esQueryVals);

    queryBody['query'] = esQuery;

    logger.debug('ES query for getting user transaction', tokenHolderAddress, queryObject);

    return queryObject;
  }

  /**
   * Set meta property.
   *
   * @private
   */
  _setMeta(esResponseData) {
    const oThis = this;
    if (esResponseData.meta[pagination.hasNextPage]) {
      let esNextPagePayload = esResponseData.meta[pagination.nextPagePayloadKey] || {};
      oThis.responseMetaData[pagination.nextPagePayloadKey] = {
        [pagination.paginationIdentifierKey]: {
          from: esNextPagePayload.from,
          limit: oThis.limit,
          meta_property: oThis.metaProperty,
          status: oThis.status
        }
      };
    }
    oThis.responseMetaData[pagination.totalNoKey] = esResponseData.meta[pagination.getEsTotalRecordKey];
  }

  /**
   * Format API response
   *
   * @return {*}
   * @private
   */
  _formatApiResponse() {
    const oThis = this;
    return responseHelper.successWithData({
      [resultType.transactions]: oThis.transactionDetails,
      [resultType.meta]: oThis.responseMetaData
    });
  }

  /***
   * getQueryObject
   * @return {{query: {query_string: {}}}}
   */

  getQueryObject() {
    return {
      query: {
        query_string: {}
      }
    };
  }

  /***
   * getUserAddressQueryString
   * @input tokenHolderAddress
   * @return String
   * Eg ( f-0x4e13fc4e514ea40cb3783cfaa4d876d49034aa18 OR t-0x33533531C09EC51D6505EAeA4A17D7810aF1DcF5924A99 )
   */

  getUserAddressQueryString(tokenHolderAddress) {
    const oThis = this,
      address = [ESConstants.formAddressPrefix + tokenHolderAddress, ESConstants.toAddressPrefix + tokenHolderAddress],
      query = esQueryFormatter.getORQuery(address);
    return esQueryFormatter.getQuerySubString(query);
  }

  /***
   * getStatusQueryString
   * @return String
   * Eg ( 0 OR 1 )
   */

  getStatusQueryString() {
    const oThis = this;

    if (oThis.integerStatuses.length === 0) return null;

    let query = esQueryFormatter.getORQuery(oThis.integerStatuses);

    return esQueryFormatter.getQuerySubString(query);
  }

  /***
   * getMetaQueryString
   * @return String
   * Eg ( ( n=transaction_name1 AND t=user_to_user1 AND d=details1) OR ( n=transaction_name2 AND t=user_to_user2 ))
   */

  getMetaQueryString() {
    const oThis = this;

    if (!oThis.metaProperty || oThis.metaProperty.length == 0) return null;

    let ln = oThis.metaProperty.length,
      cnt,
      meta = oThis.metaProperty,
      currMeta,
      currMetaValues,
      currMetaQuery,
      metaQueries = [],
      metaQueriesString;

    for (cnt = 0; cnt < ln; cnt++) {
      currMeta = meta[cnt];
      currMetaValues = oThis.getMetaVals(currMeta);
      if (currMetaValues) {
        currMetaQuery = esQueryFormatter.getAndQuery(currMetaValues);
        currMetaQuery = esQueryFormatter.getQuerySubString(currMetaQuery);
        metaQueries.push(currMetaQuery);
      }
    }

    if (metaQueries.length == 0) return null;

    metaQueriesString = esQueryFormatter.getORQuery(metaQueries);

    return esQueryFormatter.getQuerySubString(metaQueriesString);
  }

  /***
   * getMetaVals
   * @input Array[<Object>]
   * Eg [ {n:name1 , t:type1, d:details1} , {n:name2 , t:type2, d:details2}]
   * @return String
   * Eg [ "n=name" ,  "t=type" , "d=details"]
   */

  getMetaVals(meta) {
    if (!meta) return null;
    const oThis = this,
      nameKey = ESConstants.metaNameKey,
      typeKey = ESConstants.metaTypeKey,
      detailsKey = ESConstants.metaDetailsKey;

    let name = meta['name'],
      type = meta['type'],
      details = meta['details'],
      separator = '=',
      nameVal,
      typeVal,
      detailsVal,
      vals = [];

    if (name) {
      name = esQueryFormatter.getEscapedQuery(name);
      nameVal = nameKey + separator + name;
      vals.push(nameVal);
    }

    if (type) {
      type = esQueryFormatter.getEscapedQuery(type);
      typeVal = typeKey + separator + type;
      vals.push(typeVal);
    }

    if (details) {
      details = esQueryFormatter.getEscapedQuery(details);
      detailsVal = detailsKey + separator + details;
      vals.push(detailsVal);
    }

    if (vals.length == 0) return null;

    return vals;
  }

  /**
   * _defaultPageLimit
   *
   * @private
   */
  _defaultPageLimit() {
    return pagination.defaultTransactionPageSize;
  }

  /**
   * _minPageLimit
   *
   * @private
   */
  _minPageLimit() {
    return pagination.minTransactionPageSize;
  }

  /**
   * _maxPageLimit
   *
   * @private
   */
  _maxPageLimit() {
    return pagination.maxTransactionPageSize;
  }

  /**
   * _currentPageLimit
   *
   * @private
   */
  _currentPageLimit() {
    const oThis = this;

    return oThis.limit;
  }
}

InstanceComposer.registerAsShadowableClass(GetTransactionsList, coreConstants.icNameSpace, 'GetTransactionsList');

module.exports = {};
