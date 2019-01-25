'use strict';
/**
 * This module grants eth to economy owner.
 *
 * @module lib/fund/eth/ByChainOwner
 */
const BigNumber = require('bignumber.js');

const rootPrefix = '../../..',
  GrantEthBase = require(rootPrefix + '/lib/fund/eth/Base'),
  minBalances = require(rootPrefix + '/lib/fund/MinBalances'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  currencyConstants = require(rootPrefix + '/lib/globalConstant/currencies'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress');

/**
 * Class for granting eth from chain owner.
 *
 * @class
 */
class FundEthByChainOwner extends GrantEthBase {
  /**
   * Class for granting eth from chain owner.
   *
   * @param {Object} params
   *
   * @augments GrantEthBase
   *
   * @class
   */
  constructor(params) {
    super(params);
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

    oThis._initializeVars();

    await oThis._setWeb3Instance();

    await oThis._fetchRecipientAddresses();

    await oThis._fetchFromAddress();

    await oThis._fetchBalances();

    await oThis._fundAddressesIfRequired();
  }

  /**
   * Fetch from address
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _fetchFromAddress() {
    const oThis = this,
      chainAddressObj = new ChainAddressModel(),
      params = {
        chainId: oThis.originChainId,
        kind: chainAddressConst.chainOwnerKind
      };

    let fetchAddrRsp = await chainAddressObj.fetchAddress(params);

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_e_bco_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.fromAddress = fetchAddrRsp.data.address;
  }

  /**
   * Fetch recipient addresses
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchRecipientAddresses() {
    const oThis = this;

    oThis.addresses = {};

    for (let addressKind in minBalances[currencyConstants.eth]) {
      let params = {
        chainId: oThis.originChainId,
        kind: addressKind
      };

      if (chainAddressConst.pairAddressKinds.includes(addressKind)) {
        params['auxChainId'] = oThis.auxChainId;
      }

      let fetchAddrRsp = await new ChainAddressModel().fetchAddress(params);

      if (!fetchAddrRsp.data.address) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_f_e_b_2',
            api_error_identifier: 'something_went_wrong'
          })
        );
      }

      oThis.addresses[addressKind] = fetchAddrRsp.data.address;
    }
  }

  /**
   * Fund the addresses if required
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fundAddressesIfRequired() {
    const oThis = this;

    let differenceAmounts = {};

    for (let addressKind in minBalances[currencyConstants.eth]) {
      let minBalance = minBalances[currencyConstants.eth][addressKind];
      let actualBalance = oThis.balances[addressKind];

      let minBalanceBN = new BigNumber(minBalance),
        actualBalanceBN = new BigNumber(actualBalance);

      if (minBalanceBN.gt(actualBalanceBN)) {
        differenceAmounts[addressKind] = minBalanceBN.minus(actualBalanceBN).toString(10);
      }
    }

    for (let addressKind in differenceAmounts) {
      let address = oThis.addresses[addressKind],
        amount = differenceAmounts[addressKind];

      await oThis._fundAddress(address, amount);
    }
  }
}

module.exports = FundEthByChainOwner;
