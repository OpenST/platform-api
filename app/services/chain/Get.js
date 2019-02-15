'use strict';
/**
 * This service helps in fetching chain details.
 *
 * @module app/services/chain/Get
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');

// Following require(s) for registering into instance composer.
require(rootPrefix + '/lib/cacheManagement/shared/BlockTimeDetails');

/**
 * Class to get chain details.
 *
 * @class
 */
class Get extends ServiceBase {
  /**
   * Constructor for getting chain details.
   *
   * @param {Object} params
   * @param {Number/String} params.chain_id: chain Id
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.chainId = Number(params.chain_id);
  }

  /**
   * Main performer for the class.
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    let response = await oThis._fetchChain();

    if (!CommonValidators.validateInteger(response.data.blockHeight)) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_c_g_1',
          api_error_identifier: 'resource_not_found',
          debug_options: {}
        })
      );
    }

    return Promise.resolve(responseHelper.successWithData({ [resultType.chain]: response.data }));
  }

  /**
   * Fetch chain details.
   *
   * @return {Promise<string>}
   */
  async _fetchChain() {
    const oThis = this,
      chainConfigMap = await chainConfigProvider.getFor([oThis.chainId]),
      chainConfig = chainConfigMap[oThis.chainId];

    let isOriginChainId = false;

    // Check if chainId is originChainId or not.
    if (oThis.chainId === chainConfig.originGeth.chainId) {
      isOriginChainId = true;
    }
    // If chainId is not originChainId, check if it is auxChainId or not. We are not specifically checking the
    // auxChainId value because if chainConfig has the 'auxGeth' property, the chainId will obviously be the same.
    if (!isOriginChainId && !chainConfig.hasOwnProperty('auxGeth')) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'a_s_c_g_3',
          api_error_identifier: 'invalid_chain_id',
          debug_options: {}
        })
      );
    }

    const instanceComposer = new InstanceComposer(chainConfig),
      BlockTimeDetailsCache = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'BlockTimeDetailsCache'),
      blockTimeDetailsCacheObj = new BlockTimeDetailsCache({
        chainId: oThis.chainId,
        isOriginChainId: isOriginChainId
      });

    let blockDetails = await blockTimeDetailsCacheObj.fetch(),
      blockNumberInCache = blockDetails.data.block,
      blockGenerationTimeInBigNumber = basicHelper.convertToBigNumber(blockDetails.data.blockGenerationTime),
      blockCreatedTimestampInBigNumber = basicHelper.convertToBigNumber(blockDetails.data.createdTimestamp),
      currentTimestampInBigNumber = basicHelper.convertToBigNumber(Math.floor(Date.now() / 1000));

    let currentBlockNumberDelta = currentTimestampInBigNumber
        .minus(blockCreatedTimestampInBigNumber)
        .div(blockGenerationTimeInBigNumber)
        .toString(10),
      currentBlockNumber = blockNumberInCache + Number(currentBlockNumberDelta);

    return responseHelper.successWithData({
      id: oThis.chainId,
      blockHeight: Math.floor(currentBlockNumber),
      updatedTimestamp: currentTimestampInBigNumber.toString(10)
    });
  }
}

module.exports = Get;
