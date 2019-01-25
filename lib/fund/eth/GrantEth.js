'use strict';
/**
 * This module grants eth to economy owner.
 *
 * @module lib/fund/eth/GrantEth
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  Base = require(rootPrefix + '/lib/fund/eth/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  grantConstants = require(rootPrefix + '/lib/globalConstant/grant'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  environmentConst = require(rootPrefix + '/lib/globalConstant/environmentInfo'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

class GrantEth extends Base {
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.clientId = params.clientId;
    oThis.ownerAddress = params.address;
  }

  /**
   * _asyncPerform
   *
   * @return {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis.validate();

    oThis._initializeVars();

    await oThis._setWeb3Instance();

    await oThis._fetchFromAddress();

    await oThis.fetchBalancesAndFund();

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      })
    );
  }

  validate() {
    if (
      !(coreConstants.environment === environmentConst.environment.production) &&
      !(coreConstants.subEnvironment === environmentConst.subEnvironment.mainnet)
    )
      logger.info('Non production Sandbox environment');
    else {
      return responseHelper.error({
        internal_error_identifier: 'l_f_e_ge_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: '',
        error_config: {}
      });
    }
  }

  async _fetchFromAddress() {
    const oThis = this,
      granterAddressResponse = await new ChainAddressModel().fetchAddress({
        chainId: oThis.originChainId,
        auxChainId: oThis.auxChainId,
        kind: chainAddressConstants.granterKind
      });
    oThis.fromAddress = granterAddressResponse.data.addresses[0];

    console.log('oThis.fromAddress', oThis.fromAddress);
  }

  async fetchBalancesAndFund() {
    const oThis = this;
    let granterBalance = await oThis.originWeb3.eth.getBalance(oThis.fromAddress);
    console.log('granterBalance', granterBalance);
    if (granterBalance >= grantConstants.grantEthValue) {
      let granteeBalance = await oThis.originWeb3.eth.getBalance(oThis.ownerAddress);

      console.log('granteeBalance', granteeBalance);
      if (granteeBalance >= grantConstants.grantEthValue) {
        return Promise.resolve(
          responseHelper.successWithData({
            taskStatus: workflowStepConstants.taskDone
          })
        );
      } else {
        return oThis._fundAddress(oThis.ownerAddress, grantConstants.grantEthValue);
      }
    } else {
      logger.info('Granter does not have enough balance');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_ge_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: '',
          error_config: {}
        })
      );
    }
  }
}

module.exports = GrantEth;
