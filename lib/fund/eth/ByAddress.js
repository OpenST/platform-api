'use strict';

const rootPrefix = '../../..',
  Base = require(rootPrefix + '/lib/fund/eth/Base'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  currencyConstants = require(rootPrefix + '/lib/globalConstant/currencies'),
  minBalances = require(rootPrefix + '/lib/fund/MinBalances');

const BigNumber = require('bignumber.js');

class FundByAddress extends Base {
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.fromAddress = params.fromAddress;
  }

  /**
   * _asyncPerform
   *
   * @return {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    oThis._initializeVars();

    await oThis._setWeb3Instance();

    await oThis._fetchRecipientAddresses();

    await oThis._fetchBalances();

    await oThis._fundAddressesIfRequired();
  }

  /**
   * fetch recipient addresses
   *
   * @return {Promise<void>}
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
            internal_error_identifier: 'l_f_e_ba_1',
            api_error_identifier: 'something_went_wrong'
          })
        );
      }

      oThis.addresses[addressKind] = fetchAddrRsp.data.address;
    }
  }

  /**
   * _fundAddressesIfRequired
   *
   * @return {Promise<void>}
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

module.exports = FundByAddress;
