'use strict';

const rootPrefix = '../../..',
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  transactionMetaConst = require(rootPrefix + '/lib/globalConstant/transactionMeta'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  ProgressMintBase = require(rootPrefix + '/lib/stakeAndMint/common/ProgressMintBase');

const uuidv4 = require('uuid/v4');

class ProgressMintForBt extends ProgressMintBase {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.tokenId = params.tokenId;
  }

  /**
   * fetch co gateway contract address
   *
   * @private
   */
  async _fetchCoGatewayContractAddress() {
    const oThis = this;

    let tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.coGatewayContract = addressesResp.data[tokenAddressConstants.tokenCoGatewayContract];
  }

  /**
   * Aux chain gas price for BT stake and mint
   *
   * @return {*}
   * @private
   */
  _fetchGasPrice() {
    const oThis = this;

    return contractConstants.auxChainGasPrice;
  }
}

module.exports = ProgressMintForBt;
