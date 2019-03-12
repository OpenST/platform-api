'use strict';
/**
 * This service helps in fetching transactions of a user by user id.
 *
 * @module app/services/transaction/get/ByUserId
 */
const OSTBase = require('@ostdotcom/base');

const rootPrefix = '../../../..',
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  ESConstants = require(rootPrefix + '/lib/elasticsearch/config/constants'),
  GetTransactionBase = require(rootPrefix + '/app/services/transaction/get/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  pagination = require(rootPrefix + '/lib/globalConstant/pagination'),
  pendingTransactionConstant = require(rootPrefix + '/lib/globalConstant/pendingTransaction'),
  esQueryFormatter = require(rootPrefix + '/lib/elasticsearch/helpers/queryFormatter');

const InstanceComposer = OSTBase.InstanceComposer;

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
   * Validate and sanitize parameters.
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

      if (oThis.metaProperty) {
        oThis.metaProperty = await basicHelper.sanitizeMetaPropertyData(oThis.metaProperty);

        if (!CommonValidators.validateMetaPropertyArray(oThis.metaProperty)) {
          return Promise.reject(
            responseHelper.paramValidationError({
              internal_error_identifier: 'a_s_t_g_bu_1',
              api_error_identifier: 'invalid_api_params',
              params_error_identifiers: ['invalid_meta_property'],
              debug_options: {}
            })
          );
        }
      } else {
        oThis.metaProperty = [];
      }

      oThis.limit = oThis.limit || oThis._defaultPageLimit();

      oThis.from = 0;
    }

    // Validate status
    await oThis._validateAndSanitizeStatus();

    // Validate limit
    return oThis._validatePageSize();
  }

  /**
   *
   * @private
   */
  _validateSearchResults() {
    // Nothing to do.
  }

  /**
   * Set meta property.
   *
   * @private
   */
  _setMeta() {
    const oThis = this,
      esResponseData = oThis.esSearchResponse.data;

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
   *
   * @private
   */
  _formatApiResponse() {
    const oThis = this;

    return responseHelper.successWithData({
      [resultType.transactions]: oThis.txDetails,
      [resultType.meta]: oThis.responseMetaData
    });
  }

  /**
   * Get elastic search query.
   *
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
   *
   * @private
   **/
  _getEsQueryObject() {
    const oThis = this,
      addressQueryString = oThis._getUserAddressQueryString(),
      statusQueryString = oThis._getStatusQueryString(),
      metaQueryString = oThis._getMetaQueryString(),
      queryFieldKey = metaQueryString ? 'fields' : 'default_field';

    let queryObject = oThis._getQueryObject(),
      queryBody = queryObject['query']['query_string'],
      esQueryVals = [addressQueryString],
      esQuery;

    if (queryFieldKey === 'fields') {
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

    queryBody.query = esQuery;

    logger.debug('ES query for getting user transaction', oThis.tokenHolderAddress, queryObject);

    queryObject.size = oThis.limit;
    queryObject.from = oThis.from;

    return queryObject;
  }

  /**
   * Get query object.
   *
   * @returns {{query: {query_string: {}}}}
   *
   * @private
   */
  _getQueryObject() {
    return {
      query: {
        query_string: {}
      }
    };
  }

  /**
   * Get user address string.
   *
   * Eg ( f-0x4e13fc4e514ea40cb3783cfaa4d876d49034aa18 OR t-0x33533531C09EC51D6505EAeA4A17D7810aF1DcF5924A99 )
   *
   * @returns {String}
   *
   * @private
   */
  _getUserAddressQueryString() {
    const oThis = this;

    const address = [
        ESConstants.formAddressPrefix + oThis.tokenHolderAddress,
        ESConstants.toAddressPrefix + oThis.tokenHolderAddress
      ],
      query = esQueryFormatter.getORQuery(address);
    return esQueryFormatter.getQuerySubString(query);
  }

  /**
   * Get status query string.
   *
   * @returns {*}
   *
   * @private
   */
  _getStatusQueryString() {
    const oThis = this;

    if (oThis.integerStatuses.length === 0) return null;

    let query = esQueryFormatter.getORQuery(oThis.integerStatuses);

    return esQueryFormatter.getQuerySubString(query);
  }

  /**
   * Get meta query string.
   *
   * @returns {*}
   * Eg ( ( n=transaction_name1 AND t=user_to_user1 AND d=details1) OR ( n=transaction_name2 AND t=user_to_user2 ))
   *
   * @private
   */
  _getMetaQueryString() {
    const oThis = this;

    if (!oThis.metaProperty || oThis.metaProperty.length === 0) return null;

    let metaQueries = [];

    for (let cnt = 0; cnt < oThis.metaProperty.length; cnt++) {
      let currMeta = oThis.metaProperty[cnt],
        currMetaValues = oThis._getMetaVals(currMeta);
      if (currMetaValues) {
        let currMetaQuery = esQueryFormatter.getAndQuery(currMetaValues);
        currMetaQuery = esQueryFormatter.getQuerySubString(currMetaQuery);
        metaQueries.push(currMetaQuery);
      }
    }

    if (metaQueries.length === 0) return null;

    let metaQueriesString = esQueryFormatter.getORQuery(metaQueries);

    return esQueryFormatter.getQuerySubString(metaQueriesString);
  }

  /**
   * Get meta values.
   *
   * @param meta
   * Eg [ {n:name1 , t:type1, d:details1} , {n:name2 , t:type2, d:details2}]
   *
   * @returns {*}
   */
  _getMetaVals(meta) {
    if (!meta) return null;

    const nameKey = ESConstants.metaNameKey,
      typeKey = ESConstants.metaTypeKey,
      detailsKey = ESConstants.metaDetailsKey;

    let name = meta['name'],
      type = meta['type'],
      details = meta['details'],
      separator = '=',
      vals = [];

    if (name) {
      name = esQueryFormatter.getEscapedQuery(name);
      let nameVal = nameKey + separator + name;
      vals.push(nameVal);
    }

    if (type) {
      type = esQueryFormatter.getEscapedQuery(type);
      let typeVal = typeKey + separator + type;
      vals.push(typeVal);
    }

    if (details) {
      details = esQueryFormatter.getEscapedQuery(details);
      let detailsVal = detailsKey + separator + details;
      vals.push(detailsVal);
    }

    if (vals.length == 0) return null;

    return vals;
  }

  /**
   * Default page limit.
   *
   * @private
   */
  _defaultPageLimit() {
    return pagination.defaultTransactionPageSize;
  }

  /**
   * Minimum page limit.
   *
   * @private
   */
  _minPageLimit() {
    return pagination.minTransactionPageSize;
  }

  /**
   * Maximum page limit.
   *
   * @private
   */
  _maxPageLimit() {
    return pagination.maxTransactionPageSize;
  }

  /**
   * Current page limit.
   *
   * @private
   */
  _currentPageLimit() {
    const oThis = this;

    return oThis.limit;
  }

  /**
   * Status validations
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _validateAndSanitizeStatus() {
    const oThis = this;

    if (!oThis.status.length) return;

    const validStatuses = pendingTransactionConstant.invertedStatuses;

    for (let i = 0; i < oThis.status.length; i++) {
      let currStatusInt = validStatuses[oThis.status[i]];
      if (!currStatusInt) {
        return Promise.reject(
          responseHelper.paramValidationError({
            internal_error_identifier: 'a_s_t_g_bu_2',
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
}

InstanceComposer.registerAsShadowableClass(GetTransactionsList, coreConstants.icNameSpace, 'GetTransactionsList');

module.exports = {};
