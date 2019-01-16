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
    '2': tokenAddressConstants.adminAddressKind,
    '3': tokenAddressConstants.workerAddressKind,

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
   * @param {String} params.kinds - address kind
   *
   * @return {Promise}
   */
  async fetchAddresses(params) {
    const oThis = this,
      addressKinds = params['kinds'],
      addressKindIntToStrMap = {};

    for (let i = 0; i < addressKinds.length; i++) {
      let addressKindStr = addressKinds[i],
        addressKindInt = invertedKinds[addressKindStr];
      if (!addressKindInt) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'm_m_ta_1',
            api_error_identifier: 'something_went_wrong',
            debug_options: { addressKind: addressKindStr }
          })
        );
      }
      addressKindIntToStrMap[addressKindInt] = addressKindStr;
    }

    let returnData = {};

    let dbRows = await oThis
      .select('*')
      .where(['token_id = ?', params.tokenId])
      .where(['kind IN (?)', Object.keys(addressKindIntToStrMap)])
      .fire();

    for (let i = 0; i < dbRows.length; i++) {
      let dbRow = dbRows[i],
        addressKindStr = kinds[dbRow.kind.toString()];

      if (tokenAddressConstants.uniqueKinds.indexOf(addressKindStr) > -1) {
        returnData[addressKindStr] = { address: dbRow.address };
      } else {
        if (!returnData[addressKindStr]) {
          returnData[addressKindStr] = { addresses: [] };
        }
        returnData[addressKindStr]['addresses'].push(dbRow.address);
      }
    }

    return responseHelper.successWithData(returnData);
  }
}

module.exports = TokenAddress;
