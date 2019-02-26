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

  /**
   * Perform Progress Mint
   *
   * @return {Promise<void>}
   * @private
   */
  async _performProgressMint() {
    const oThis = this;

    let submitRsp = await super._performProgressMint();

    if (submitRsp.isFailure()) {
      return Promise.reject(submitRsp);
    }

    await new TransactionMetaModel()
      .insert({
        transaction_uuid: uuidv4(),
        transaction_hash: submitRsp.data.transactionHash,
        associated_aux_chain_id: oThis.auxChainId,
        token_id: oThis.tokenId,
        status: transactionMetaConst.invertedStatuses[transactionMetaConst.submittedToGethStatus],
        kind: transactionMetaConst.invertedKinds[transactionMetaConst.ruleExecution],
        next_action_at: transactionMetaConst.getNextActionAtFor(transactionMetaConst.submittedToGethStatus)
      })
      .fire();

    return submitRsp;
  }
}

module.exports = ProgressMintForBt;
