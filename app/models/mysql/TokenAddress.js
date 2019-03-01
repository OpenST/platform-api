'use strict';
/**
 * This is model for token_addresses table.
 *
 * @module app/models/mysql/TokenAddress
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
    '8': tokenAddressConstants.txWorkerAddressKind,
    '9': tokenAddressConstants.tokenUserOpsWorkerKind,
    '10': tokenAddressConstants.recoveryControllerAddressKind,

    //Contract Kinds
    '51': tokenAddressConstants.originOrganizationContract,
    '52': tokenAddressConstants.auxOrganizationContract,
    '53': tokenAddressConstants.brandedTokenContract,
    '54': tokenAddressConstants.utilityBrandedTokenContract,
    '55': tokenAddressConstants.tokenGatewayContract,
    '56': tokenAddressConstants.tokenCoGatewayContract,
    '57': tokenAddressConstants.simpleStakeContract,
    '58': tokenAddressConstants.tokenRulesContractKind,
    '59': tokenAddressConstants.tokenHolderMasterCopyContractKind,
    '60': tokenAddressConstants.userWalletFactoryContractKind,
    '61': tokenAddressConstants.gnosisSafeMultiSigMasterCopyContractKind,
    '62': tokenAddressConstants.proxyFactoryContractKind,
    '63': tokenAddressConstants.delayedRecoveryModuleMasterCopyContractKind,
    '64': tokenAddressConstants.createAndAddModulesContractKind
  },
  invertedKinds = util.invert(kinds),
  statuses = {
    '1': tokenAddressConstants.activeStatus,
    '2': tokenAddressConstants.inActiveStatus
  },
  invertedStatuses = util.invert(statuses);

const deployedChainKinds = {
    '1': coreConstants.originChainKind,
    '2': coreConstants.auxChainKind
  },
  invertedDeployedChainKinds = util.invert(deployedChainKinds);

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

  get statuses() {
    return statuses;
  }

  get invertedStatuses() {
    return invertedStatuses;
  }

  get deployedChainKinds() {
    return deployedChainKinds;
  }

  get invertedDeployedChainKinds() {
    return invertedDeployedChainKinds;
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
   * Get token address details by token_id and kind
   *
   * @param params
   *
   * @return {*|void}
   */
  async getTokenAddressById(params) {
    const oThis = this;

    let response = await oThis
      .select('*')
      .where({ id: params.tokenAddressId })
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
        known_address_id: params.knownAddressId,
        deployed_chain_id: params.deployedChainId,
        deployed_chain_kind: params.deployedChainKind
      })
      .fire();

    await TokenAddress.flushCache(params.tokenId);

    return responseHelper.successWithData(insertRsp);
  }

  /**
   * Get token id from address and chain id
   *
   * @param params
   *
   * @return {*|void}
   */
  async getTokenIdByAddress(params) {
    const oThis = this;

    let query = oThis
      .select('token_id, kind, address')
      .where(['address IN (?) AND status = ?', params.addresses, invertedStatuses[tokenAddressConstants.activeStatus]]);

    if (invertedKinds[params.chainId]) {
      query.where(['AND deployed_chain_id = ?', oThis.chainId]);
    }

    let response = await query.fire();

    let result = {};
    for (let i = 0; i < response.length; i++) {
      let data = response[i];
      result[data.address] = data;
    }

    return responseHelper.successWithData(result);
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
