'use strict';
/**
 * This module grants eth to economy owner.
 *
 * @module lib/fund/eth/ByAddress
 */
const BigNumber = require('bignumber.js');

const rootPrefix = '../../..',
  GrantEthBase = require(rootPrefix + '/lib/fund/eth/Base'),
  minBalances = require(rootPrefix + '/lib/fund/MinBalances'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  currencyConstants = require(rootPrefix + '/lib/globalConstant/currencies'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress');

/**
 * Class for granting eth from given address.
 *
 * @class
 */
class FundByAddress extends GrantEthBase {
  /**
   * Class for granting eth from given address.
   *
   * @param {Object} params
   * @param {String} params.fromAddress
   *
   * @augments GrantEthBase
   *
   * @class
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.fromAddress = params.fromAddress;
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

    await oThis._fetchBalances();

    await oThis._fundAddressesIfRequired();

    logger.info('===All funding in this iteration is triggered===');

    return responseHelper.successWithData({});
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
            internal_error_identifier: 'l_f_e_ba_1',
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
      let minBalance = minBalances[currencyConstants.eth][addressKind],
        actualBalance = oThis.balances[addressKind];

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
