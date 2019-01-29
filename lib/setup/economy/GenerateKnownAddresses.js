'use strict';
/**
 * Generate Internal Addresses for economy setup
 *
 * @module tools/helpers/GenerateChainKnownAddresses
 */
const rootPrefix = '../../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  tokenAddressConstant = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  GenerateTokenAddress = require(rootPrefix + '/lib/generateKnownAddress/Token'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

/**
 * Class to generate addresses for economy setup.
 *
 * @class
 */
class GenerateInternalAddresses {
  /**
   * Generate Internal addresses required for setup.
   *
   * @constructor
   *
   * @param {object} params - external passed parameters
   * @param {number} params.tokenId - token id
   * @param {string} params.chainKind - chain kind
   * @param {number} params.originChainId - origin chain id
   * @param {number} params.auxChainId - aux chain id
   */
  constructor(params) {
    const oThis = this;
    oThis.tokenId = params.tokenId;
    oThis.originChainId = params.originChainId;
    oThis.auxChainId = params.auxChainId;
    oThis.addressKinds = [
      tokenAddressConstant.auxAdminAddressKind,
      tokenAddressConstant.auxWorkerAddressKind,
      tokenAddressConstant.auxFunderAddressKind
    ];
  }

  /**
   * Generate addresses.
   *
   * @return {Promise<Array>}
   */
  async perform() {
    const oThis = this;

    await oThis._copyOverTokenAdminAddress();

    return oThis._generateAddresses();
  }

  /**
   * Copy over tokenAdmin addresses from chain addresses into token address
   */
  async _copyOverTokenAdminAddress() {
    const oThis = this;

    let dbRows = await new ChainAddressModel()
      .select('*')
      .where([
        'chain_id = ? AND status = ?',
        oThis.originChainId,
        chainAddressConstants.invertedStatuses[chainAddressConstants.activeStatus]
      ])
      .where([
        'kind IN (?)',
        [
          chainAddressConstants.invertedKinds[chainAddressConstants.tokenWorkerKind],
          chainAddressConstants.invertedKinds[chainAddressConstants.tokenAdminKind]
        ]
      ])
      .fire();

    let invertedKinds = new TokenAddressModel().invertedKinds;

    for (let i = 0; i < dbRows.length; i++) {
      let dbRow = dbRows[i],
        kind;
      if (dbRow.kind == chainAddressConstants.invertedKinds[chainAddressConstants.tokenAdminKind]) {
        kind = invertedKinds[tokenAddressConstant.originAdminAddressKind];
      } else if (dbRow.kind == chainAddressConstants.invertedKinds[chainAddressConstants.tokenWorkerKind]) {
        kind = invertedKinds[tokenAddressConstant.originWorkerAddressKind];
      }
      await new TokenAddressModel().insertAddress({
        tokenId: oThis.tokenId,
        kind: kind,
        address: dbRow.address,
        knownAddressId: dbRow.known_address_id
      });
    }
  }

  /**
   * Generate addresses.
   *
   * @return {Promise<Array>}
   */
  async _generateAddresses() {
    const oThis = this,
      tokenAddressModelObj = new TokenAddressModel();
    for (let i = 0; i < oThis.addressKinds.length; i++) {
      if (!tokenAddressModelObj.invertedKinds[oThis.addressKinds[i]]) {
        fail`invalid kind ${oThis.addressKinds[i]}`;
      }
    }

    let addressKindToValueMap = {};

    for (let i = 0; i < oThis.addressKinds.length; i++) {
      let addressKind = oThis.addressKinds[i];
      const generateEthAddress = new GenerateTokenAddress({
        tokenId: oThis.tokenId,
        addressKind: addressKind,
        chainId: oThis.auxChainId
      });

      let r = await generateEthAddress.perform();

      if (r.isFailure()) {
        logger.error('Address generation failed ============ ', r);
        process.exit(0);
      }
      Object.assign(addressKindToValueMap, r.data);
    }
    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskDone,
      addressKindToValueMap: addressKindToValueMap
    });
  }
}

module.exports = GenerateInternalAddresses;
