'use strict';
/**
 * This is model for workflow_setup table.
 *
 * @module app/models/mysql/WorkflowStep
 */
const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment,
  kinds = {
    '1': tokenAddressConstants.ownerAddressKind,
    '2': tokenAddressConstants.originAdminAddressKind,
    '3': tokenAddressConstants.auxAdminAddressKind,
    '4': tokenAddressConstants.originWorkerAddressKind,
    '5': tokenAddressConstants.auxWorkerAddressKind,
    '6': tokenAddressConstants.auxFunderAddressKind,
    '7': tokenAddressConstants.whiteListedAddressKind,

    //Contract Kinds
    '51': tokenAddressConstants.originOrganizationContract,
    '52': tokenAddressConstants.auxOrganizationContract,
    '53': tokenAddressConstants.brandedTokenContract,
    '54': tokenAddressConstants.utilityBrandedTokenContract,
    '55': tokenAddressConstants.tokenGatewayContract,
    '56': tokenAddressConstants.tokenCoGatewayContract,
    '57': tokenAddressConstants.simpleStakeContract
  },
  invertedKinds = util.invert(kinds),
  statuses = {
    '1': tokenAddressConstants.activeStatus,
    '2': tokenAddressConstants.inActiveStatus
  },
  invertedStatuses = util.invert(statuses);

/**
 * Class for token address model
 *
 * @class
 */
class TokenAddress extends ModelBase {
  /**
   * Constructor for token address model
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'token_addresses';
  }

  get kinds() {
    return kinds;
  }

  get invertedKinds() {
    return invertedKinds;
  }

  /**
   * Get token address details by token_id and kind
   *
   * @param params
   *
   * @return {*|void}
   */
  async getAddressByTokenIdAndKind(params) {
    const oThis = this;

    let response = await oThis
      .select('*')
      .where([
        'token_id = ? AND kind = ? AND status = ?',
        params.tokenId,
        params.kind,
        invertedStatuses[tokenAddressConstants.activeStatus]
      ])
      .fire();

    return responseHelper.successWithData(response[0]);
  }

  /**
   * fetch addresses
   *
   * @param {object} params - external passed parameters
   * @param {Integer} params.tokenId - tokenId
   *
   * @return {Promise}
   */
  async fetchAllAddresses(params) {
    const oThis = this;

    let returnData = {};

    let dbRows = await oThis
      .select('*')
      .where(['token_id = ? AND status = ?', params.tokenId, invertedStatuses[tokenAddressConstants.activeStatus]])
      .fire();

    for (let i = 0; i < dbRows.length; i++) {
      let dbRow = dbRows[i],
        addressKindStr = kinds[dbRow.kind.toString()];

      if (tokenAddressConstants.uniqueKinds.indexOf(addressKindStr) > -1) {
        returnData[addressKindStr] = dbRow.address;
      } else {
        if (!returnData[addressKindStr]) {
          returnData[addressKindStr] = [];
        }
        returnData[addressKindStr].push(dbRow.address);
      }
    }

    return responseHelper.successWithData(returnData);
  }

  /***
   *
   * @return {Promise<void>}
   */
  async insertAddress(params) {
    const oThis = this;

    let insertRsp = await oThis
      .insert({
        token_id: params.tokenId,
        kind: params.kind,
        address: params.address.toLowerCase(),
        known_address_id: params.knownAddressId
      })
      .fire();

    await TokenAddress.flushCache(params.tokenId);

    return responseHelper.successWithData(insertRsp);
  }

  /***
   *
   * flush cache
   *
   * @param tokenId
   * @returns {Promise<*>}
   */
  static flushCache(tokenId) {
    const TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress');
    return new TokenAddressCache({
      tokenId: tokenId
    }).clear();
  }
}

module.exports = TokenAddress;
