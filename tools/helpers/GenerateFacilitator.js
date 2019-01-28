'use strict';

/**
 * This is helper class for creating facilitator address
 *
 * @module tools/helpers/GenerateFacilitator
 */

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  GenerateChainKnownAddresses = require(rootPrefix + '/tools/helpers/GenerateChainKnownAddresses'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

class GenerateFacilitator {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.originChainId = params.originChainId;
  }

  /**
   * perform
   *
   * @return {Promise<void>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('tools/helpers/GenerateFacilitator.js::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 't_h_gf_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * asyncPerform
   *
   * @return {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;

    await oThis.createFacilitator();

    await oThis.updateRemoteChainId();
  }

  /**
   * createFacilitator - This method creates a new address, facilitator
   *
   * @return {Promise<void>}
   */
  async createFacilitator() {
    const oThis = this;

    let generateChainKnownAddresses = new GenerateChainKnownAddresses({
      addressKinds: [chainAddressConst.facilitator],
      chainKind: coreConstants.originChainKind,
      chainId: oThis.originChainId
    });

    let response = await generateChainKnownAddresses.perform();

    oThis.facilitator = response.data.addressKindToValueMap[chainAddressConst.facilitator];
  }

  /**
   * updateRemoteChainId - This method updates the remote chain id of facilitator
   *
   * @return {Promise<void>}
   */
  async updateRemoteChainId() {
    const oThis = this;

    let chainAddressModel = new ChainAddressModel();

    await chainAddressModel
      .update({ aux_chain_id: oThis.auxChainId })
      .where({
        chain_id: oThis.originChainId,
        chain_kind: chainAddressConst.invertedChainKinds[coreConstants.originChainKind],
        kind: chainAddressConst.invertedKinds[chainAddressConst.facilitator]
      })
      .fire();
  }
}

module.exports = GenerateFacilitator;
