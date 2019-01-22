'use strict';

/*
 * This file helps in checking allowance of spender
 */

const rootPrefix = '../../..',
  Base = require(rootPrefix + '/lib/stakeMintManagement/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  StakerWhitelistedAddressModel = require(rootPrefix + '/app/models/mysql/StakerWhitelistedAddress'),
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  BigNumber = require('bignumber.js');

class CheckGatewayComposerAllowance extends Base {
  /**
   * @constructor
   *
   * @param params
   *
   * @param params.stakerAddress        {String}
   * @param params.amountToStake          {String}
   * @param params.originChainId        {Number}
   * @param params.tokenId              {Number}
   */
  constructor(params) {
    super(params);
  }

  /***
   * Async performer for the class.
   *
   * @private
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();

    await oThis._fetchGatewayComposer();

    await oThis._getAllowance();

    if (oThis._checkAllowance()) {
      return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskDone });
    } else {
      return responseHelper.successWithData({ taskStatus: workflowStepConstants.taskFailed });
    }
  }

  /**
   * _fetchGatewayComposer
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchGatewayComposer() {
    const oThis = this;

    let stakerWhitelistedAddressObj = new StakerWhitelistedAddressModel();

    let response = await stakerWhitelistedAddressObj.fetchAddress({
      tokenId: oThis.tokenId,
      stakerAddress: oThis.stakerAddress
    });

    oThis.gatewayComposer = response.data.gatewayComposerAddress;
  }

  /**
   * _getAllowance
   *
   * @return {Promise<void>}
   * @private
   */
  async _getAllowance() {
    const oThis = this;

    let abi = CoreAbis.simpleToken;

    let simpleTokenContract = null,
      resp = await new ChainAddressModel().fetchAddress({
        chainId: oThis.originChainId,
        kind: chainAddressConst.baseContractKind
      });
    if (resp.isSuccess()) {
      simpleTokenContract = resp.data.address;
    }

    let simpleTokenContractObject = new oThis.originWeb3.eth.Contract(abi, simpleTokenContract);

    oThis.allowance = await simpleTokenContractObject.methods
      .allowance(oThis.stakerAddress, oThis.gatewayComposer)
      .call({});
  }

  /**
   * _checkAllowance
   *
   * @return {Promise<boolean>}
   * @private
   */
  async _checkAllowance() {
    const oThis = this;

    let allowance = new BigNumber(oThis.allowance),
      stakeAmount = new BigNumber(oThis.amountToStake);

    if (allowance.gte(stakeAmount)) return true;

    return false;
  }
}

module.exports = CheckGatewayComposerAllowance;
