'use strict';

const rootPrefix = '../../..',
  Base = require(rootPrefix + '/lib/fund/eth/Base'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class FundEthByChainOwner extends Base {
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

    await oThis.setWeb3Instance();

    await oThis.fetchAddresses();

    await oThis.fetchChainOwner();

    await oThis.fetchBalances();

    await oThis.fundAddresses();
  }

  /**
   * fetchChainOwner
   *
   * @return {Promise<never>}
   */
  async fetchChainOwner() {
    const oThis = this;

    let chainAddressObj = new ChainAddressModel();

    let params = {
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
}

module.exports = FundEthByChainOwner;
