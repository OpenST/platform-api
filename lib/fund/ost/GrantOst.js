'use strict';
/**
 * This module grants eth to economy owner.
 *
 * @module lib/fund/ost/GrantOst
 */
const rootPrefix = '../../..',
  GrantOstBase = require(rootPrefix + '/lib/fund/ost/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  grantConstants = require(rootPrefix + '/lib/globalConstant/grant'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  environmentConst = require(rootPrefix + '/lib/globalConstant/environmentInfo'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  AddressPrivateKeyCache = require(rootPrefix + '/lib/sharedCacheManagement/AddressPrivateKey');

/**
 * Class for granting ost.
 *
 * @class
 */
class GrantOst extends GrantOstBase {
  /**
   * Constructor for granting ost.
   *
   * @param {Object} params
   * @param {Integer} params.clientId
   * @param {Integer} params.originChainId
   * @param {String} params.address
   *
   * @augments GrantOstBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.clientId;
    oThis.ownerAddress = params.address;
    oThis.originChainId = params.originChainId;
    oThis.senderPrivateKey = null;
  }

  /**
   * Async perform
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    oThis._validate();

    await oThis._setWeb3Instance();

    await oThis._fetchSenderPrivateKey();

    //let fundResponse =
    await oThis._fetchBalancesAndFund();

    return Promise.resolve(
      responseHelper.successWithData({
        //transactionHash: fundResponse.data.transactionHash,
        taskStatus: workflowStepConstants.taskDone
      })
    );
  }

  /**
   * Run some validations.
   *
   * @return {*}
   *
   * @private
   */
  _validate() {
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

  /**
   * Fetch sender private key.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchSenderPrivateKey() {
    const oThis = this,
      granterAddressResponse = await new ChainAddressModel().fetchAddress({
        chainId: oThis.originChainId,
        kind: chainAddressConstants.granterKind
      });

    oThis.fromAddress = granterAddressResponse.data.addresses[0];
    console.log('oThis.fromAddress', oThis.fromAddress);
    let addressPrivateKeyCache = new AddressPrivateKeyCache({ address: oThis.fromAddress }),
      cacheFetchRsp = await addressPrivateKeyCache.fetchDecryptedData();

    console.log('cacheFetchRsp', cacheFetchRsp);
    oThis.senderPrivateKey = cacheFetchRsp.data['private_key_d'];
  }

  /**
   * Fetch balances and fund the address.
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _fetchBalancesAndFund() {
    const oThis = this,
      granterBalance = await oThis.originWeb3.eth.getBalance(oThis.fromAddress);
    console.log('granterBalance', granterBalance);
    if (granterBalance >= grantConstants.grantOstValue) {
      let granteeBalance = await oThis.originWeb3.eth.getBalance(oThis.ownerAddress);

      console.log('granteeBalance', granteeBalance);
      if (granteeBalance >= grantConstants.grantOstValue) {
        return Promise.resolve(
          responseHelper.successWithData({
            taskStatus: workflowStepConstants.taskDone
          })
        );
      } else {
        return oThis._fundAddress(oThis.ownerAddress);
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

module.exports = GrantOst;
