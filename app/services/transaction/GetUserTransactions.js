'use strict';
/**
 * This service helps in fetching transactions of a user
 *
 * @module app/services/user/GetUserTransactions
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  ESConstants = require(rootPrefix + '/lib/elasticsearch/config/constants'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  esServices = require(rootPrefix + '/lib/elasticsearch/manifest'),
  ESTransactionService = esServices.services.transactions,
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

require(rootPrefix + '/lib/cacheManagement/chainMulti/TokenUserDetail');

/**
 * Class to Get User transactions
 *
 * @class
 */
class GetUserTransactions extends ServiceBase {
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

    oThis.user_id = params.user_id;
    oThis.tokenId = params.tokenId;
    oThis.status = params.status;
    oThis.meta_property = params.meta_property;
  }

  /**
   * perform - perform user creation
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateParams();

    let cacheResponse = await oThis._fetchUserFromCache(),
      userData = cacheResponse.data[oThis.userId],
      tokenHolderAddress = userData['tokenHolderAddress'];

    await oThis._validateTokenHolderAddress(tokenHolderAddress);

    const serviceConfig = oThis.getServiceConfig(),
      service = new ESTransactionService(serviceConfig),
      esQuery = oThis.getElasticSearchQuery(tokenHolderAddress);

    let userTransactions = await service.search(esQuery);

    let responseData = userTransactions; // TODO get from Dynamo

    return responseHelper.successWithData(responseData);
  }

  /**
   * Fetch user details.
   *
   * @return {Promise<string>}
   */
  async _fetchUserFromCache() {
    const oThis = this,
      TokenUserDetailsCache = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenUserDetailsCache'),
      tokenUserDetailsCacheObj = new TokenUserDetailsCache({ tokenId: oThis.tokenId, userIds: [oThis.user_id] });

    return tokenUserDetailsCacheObj.fetch();
  }

  /**
   * Validate Specific params
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateParams() {
    const oThis = this;

    if (!oThis.user_id) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 's_t_gut_1',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['missing_user_id'],
          debug_options: {}
        })
      );
    }
  }

  /**
   * Validate Specific params
   * @input tokenHolderAddress
   * @returns {Promise<never>}
   * @private
   */
  async _validateTokenHolderAddress(tokenHolderAddress) {
    const oThis = this;

    if (!oThis.tokenHolderAddress) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 's_t_gut_2',
          api_error_identifier: 'invalid_api_params',
          params_error_identifiers: ['missing_token_holder_address'], //TODO confirm
          debug_options: {}
        })
      );
    }
  }

  /**
   * getServiceConfig
   *
   * @return Object <Service config>
   *
   * Eg finalConfig = {
   *             "chainId": 123, //Aux chainId
   *             "elasticSearch": {
   *               "host":"localhost:9200",
   *               "region":"localhost",
   *               "apiKey":"elastic",
   *               "apiSecret":"changeme",
   *               "apiVersion":"6.2"
   *             }
   *   }
   **/

  getServiceConfig() {
    const oThis = this,
      configStrategy = oThis._configStrategyObject,
      chainId = configStrategy.auxChainId,
      esConfig = configStrategy.elasticSearchConfig,
      elasticSearchKey = configStrategyConstants.elasticSearch;

    let finalConfig = {
      chainId: chainId
    };

    finalConfig[elasticSearchKey] = esConfig;

    return finalConfig;
  }

  /**
   * getServiceConfig
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
   **/

  getElasticSearchQuery(tokenHolderAddress) {
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

    esQuery = oThis.getAndQuery(esQueryVals);

    queryBody['query'] = esQuery;

    logger.debug('ES query for getting user transaction', tokenHolderAddress, queryObject);

    return queryObject;
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
      query = oThis.getORQuery(address);
    return oThis.getQuerySubString(query);
  }

  /***
   * getStatusQueryString
   * @return String
   * Eg ( 0 OR 1 )
   */

  getStatusQueryString() {
    const oThis = this;

    if (!oThis.status || oThis.status.length == 0) return null;

    let query = oThis.getORQuery(oThis.status);

    return oThis.getQuerySubString(query);
  }

  /***
   * getMetaQueryString
   * @return String
   * Eg ( ( n=transaction_name1 AND t=user_to_user1 AND d=details1) || ( n=transaction_name2 AND t=user_to_user2 ))
   */

  getMetaQueryString() {
    const oThis = this;

    if (!oThis.meta_property || oThis.meta_property.length == 0) return null;

    let ln = oThis.meta_property.length,
      cnt,
      meta = oThis.meta_property,
      currMeta,
      currMetaValues,
      currMetaQuery,
      metaQueries = [],
      metaQueriesString;

    for (cnt = 0; cnt < ln; cnt++) {
      currMeta = meta[cnt];
      currMetaValues = oThis.getMetaVals(currMeta);
      if (currMetaValues) {
        currMetaQuery = oThis.getAndQuery(currMetaValues);
        currMetaQuery = oThis.getQuerySubString(currMetaQuery);
        metaQueries.push(currMetaQuery);
      }
    }

    if (metaQueries.length == 0) return null;

    metaQueriesString = oThis.getORQuery(metaQueries);

    return oThis.getQuerySubString(metaQueriesString);
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

    let name = meta[nameKey],
      type = meta[typeKey],
      details = meta[detailsKey],
      separator = '=',
      nameVal,
      typeVal,
      detailsVal,
      vals = [];

    if (name) {
      nameVal = nameKey + separator + name;
      vals.push(nameVal);
    }

    if (type) {
      typeVal = typeKey + separator + type;
      vals.push(typeVal);
    }

    if (details) {
      detailsVal = detailsKey + separator + details;
      vals.push(detailsVal);
    }

    if (vals.length == 0) return null;

    return vals;
  }

  /***
   * getORQuery
   * @input Array[String]
   * Eg [ f-0x4e13fc4e514ea40cb3783cfaa4d876d49034aa18 , t-0x33533531C09EC51D6505EAeA4A17D7810aF1DcF5924A99 ]
   * @return String
   * Eg f-0x4e13fc4e514ea40cb3783cfaa4d876d49034aa18 OR t-0x33533531C09EC51D6505EAeA4A17D7810aF1DcF5924A99
   */

  getORQuery(vals) {
    if (!vals || vals.length == 0) return null;
    const ORQuery = ' OR ';
    return vals.join(ORQuery);
  }

  /***
   * getAndQuery
   * @input Array[String]
   * Eg [ f-0x4e13fc4e514ea40cb3783cfaa4d876d49034aa18 , t-0x33533531C09EC51D6505EAeA4A17D7810aF1DcF5924A99 ]
   * @return String
   * Eg f-0x4e13fc4e514ea40cb3783cfaa4d876d49034aa18 AND t-0x33533531C09EC51D6505EAeA4A17D7810aF1DcF5924A99
   */

  getAndQuery(vals) {
    if (!vals || vals.length == 0) return null;
    const ANDQuery = ' AND ';
    return vals.join(ANDQuery);
  }

  /***
   * getAndQuery
   * @input String
   * Eg : "f-0x4e13fc4e514ea40cb3783cfaa4d876d49034aa18 AND t-0x33533531C09EC51D6505EAeA4A17D7810aF1DcF5924A99"
   * @return String
   * Eg ( string )
   */

  getQuerySubString(query) {
    return ' ( ' + query + ' ) ';
  }

  /***
   * Config strategy
   *
   * @return {Object}
   */
  get _configStrategy() {
    const oThis = this;

    return oThis.ic().configStrategy;
  }

  /**
   * Object of config strategy class
   *
   * @return {Object}
   */
  get _configStrategyObject() {
    const oThis = this;

    if (oThis.configStrategyObj) return oThis.configStrategyObj;

    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);

    return oThis.configStrategyObj;
  }
}

InstanceComposer.registerAsShadowableClass(GetUserTransactions, coreConstants.icNameSpace, 'GetUserTransactions');

module.exports = {};
