'use strict';

/**
 * set internal actor in UBT
 *
 * @module lib/setup/common/SetInternalActorInUBT
 */

const BrandedToken = require('@openstfoundation/brandedtoken.js'),
  ContractsHelper = BrandedToken.Contracts;

const rootPrefix = '../../..',
  CommonSetupBase = require(rootPrefix + '/lib/setup/common/Base'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract');

/**
 *
 * @class
 */
class SetInternalActorInUBT extends CommonSetupBase {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Number} params.chainId - chain id on which this is to be performed
   * @param {String} params.signerAddress - address who signs Tx
   * @param {String} params.chainEndpoint - url to connect to chain
   * @param {String} params.gasPrice -  gas price to use
   * @param {String} params.utilityBTContractAddress - UBT address
   * @param {String} params.actorAddress - actor to be marked as Internal
   * @param {Object} params.pendingTransactionExtraData - pending tx extra data
   * @param {Object} [params.customSubmitTxParams]: custom submit tx params (extra ones to be inserted in tx meta)
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.utilityBTContractAddress = params['utilityBTContractAddress'];
    oThis.actorAddress = params['actorAddress'];
  }

  /**
   *
   * async perform
   *
   * @return {Promise<result>}
   *
   */
  async _asyncPerform() {
    const oThis = this;

    let txOptions = {
      from: oThis.signerAddress,
      to: oThis.utilityBTContractAddress,
      gasPrice: oThis.gasPrice,
      gas: contractConstants.setInternalActorInUBTGas,
      value: contractConstants.zeroValue
    };

    let web3Instance = web3Provider.getInstance(oThis.chainEndpoint).web3WsProvider;

    let ubtInstance = ContractsHelper.getUtilityBrandedToken(web3Instance, oThis.utilityBTContractAddress, txOptions);

    let txObject = ubtInstance.methods.registerInternalActor([oThis.actorAddress]);

    txOptions['data'] = txObject.encodeABI();

    let submitRxParams = {
      chainId: oThis.chainId,
      web3Instance: web3Instance,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    };

    if (oThis.customSubmitTxParams) {
      Object.assign(submitRxParams, oThis.customSubmitTxParams);
    }

    let submitTxRsp = await new SubmitTransaction(submitRxParams).perform();

    return Promise.resolve(submitTxRsp);
  }
}

module.exports = SetInternalActorInUBT;
