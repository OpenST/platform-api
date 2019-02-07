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
  GenerateTokenAddress = require(rootPrefix + '/lib/generateKnownAddress/Token'),
  tokenAddressConstant = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

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

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_gka_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    let originDefaultBTOrgContractAddresses = [],
      invertedKinds = new TokenAddressModel().invertedKinds,
      originDefaultBTOrgContractAdminEntity =
        chainAddressesRsp.data[chainAddressConstants.originDefaultBTOrgContractAdminKind],
      originDefaultBTOrgContractWorkerEntity =
        chainAddressesRsp.data[chainAddressConstants.originDefaultBTOrgContractWorkerKind];

    originDefaultBTOrgContractAddresses.push({
      kind: invertedKinds[tokenAddressConstant.originAdminAddressKind],
      address: originDefaultBTOrgContractAdminEntity.address,
      knownAddressId: originDefaultBTOrgContractAdminEntity.knownAddressId
    });

    originDefaultBTOrgContractAddresses.push({
      kind: invertedKinds[tokenAddressConstant.originWorkerAddressKind],
      address: originDefaultBTOrgContractWorkerEntity.address,
      knownAddressId: originDefaultBTOrgContractWorkerEntity.knownAddressId
    });

    for (let i = 0; i < originDefaultBTOrgContractAddresses.length; i++) {
      await new TokenAddressModel().insertAddress({
        tokenId: oThis.tokenId,
        kind: originDefaultBTOrgContractAddresses[i].kind,
        address: originDefaultBTOrgContractAddresses[i].address,
        knownAddressId: originDefaultBTOrgContractAddresses[i].knownAddressId
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
