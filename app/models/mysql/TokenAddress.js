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
  TokenAddressCache = require(rootPrefix + '/lib/sharedCacheManagement/TokenAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment,
  kinds = {
    '1': tokenAddressConstants.ownerAddressKind,
    '2': tokenAddressConstants.adminAddressKind,
    '3': tokenAddressConstants.workerAddressKind,
    '4': tokenAddressConstants.whiteListedAddressKind,

    //Contract Kinds
    '51': tokenAddressConstants.originOrganizationContract,
    '52': tokenAddressConstants.auxOrganizationContract,
    '53': tokenAddressConstants.brandedTokenContract,
    '54': tokenAddressConstants.utilityBrandedTokenContract,
    '55': tokenAddressConstants.tokenGatewayContract,
    '56': tokenAddressConstants.tokenCoGatewayContract,
    '57': tokenAddressConstants.simpleStakeContract
  },
  invertedKinds = util.invert(kinds);

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
      .where(['token_id = ? AND kind = ?', params.tokenId, params.kind])
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
      .where(['token_id = ?', params.tokenId])
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
        kind: oThis.invertedKinds[params.kind],
        address: params.address,
        known_address_id: params.knownAddressId
      })
      .fire();

    await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).clear();

    return responseHelper.successWithData(insertRsp);
  }
}

module.exports = TokenAddress;
