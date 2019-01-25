'use strict';

const rootPrefix = '../../..',
  Base = require(rootPrefix + '/lib/fund/stPrime/Base'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  minBalances = require(rootPrefix + '/lib/fund/MinBalances'),
  currencyConstants = require(rootPrefix + '/lib/globalConstant/currencies'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  BigNumber = require('bignumber.js');

class FundStPrimeByChainOwner extends Base {
  constructor(params) {
    super(params);
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

    await oThis._fetchFromAddress();

    await oThis._fetchBalances();

    await oThis._fundAddressesIfRequired();
  }

  /**
   * fetch from address
   *
   * @return {Promise<never>}
   */
  async _fetchFromAddress() {
    const oThis = this;

    let chainAddressObj = new ChainAddressModel();

    let params = {
      chainId: oThis.auxChainId,
      kind: chainAddressConst.ownerKind
    };

    let fetchAddrRsp = await chainAddressObj.fetchAddress(params);

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_f_sp_bco_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.fromAddress = fetchAddrRsp.data.address;
  }

  /**
   * fetch recipient addresses
   *
   * @return {Promise<void>}
   */
  async _fetchRecipientAddresses() {
    const oThis = this;

    oThis.addresses = {};

    for (let addressKind in minBalances[currencyConstants.stPrime]) {
      let params = {
        chainId: oThis.auxChainId,
        kind: addressKind
      };

      if (chainAddressConst.pairAddressKinds.includes(addressKind)) {
        params['auxChainId'] = oThis.auxChainId;
      }

      let fetchAddrRsp = await new ChainAddressModel().fetchAddress(params);

      if (!fetchAddrRsp.data.address) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_f_sp_bco_2',
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

    for (let addressKind in minBalances[currencyConstants.stPrime]) {
      let minBalance = minBalances[currencyConstants.stPrime][addressKind];
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

module.exports = FundStPrimeByChainOwner;
