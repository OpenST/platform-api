'use strict';

const MosaicJs = require('@openst/mosaic.js');

const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base');

class ProgressMintBase extends StakeAndMintBase {
  /**
   * @constructor
   *
   * @param params {Object}
   * @param {Number} params.auxChainId - Aux chain Id to prove gateway on.
   * @param {String} params.messageHash - messageHash.
   * @param {String} params.facilitator - Facilitator to help in proving.
   * @param {String} params.secretString - secretString
   *
   * @param {Bool} [params.firstTimeMint] - First time mint or not (optional)
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.facilitator = params.facilitator;
    oThis.secretString = params.secretString;
    oThis.messageHash = params.messageHash;

    oThis.coGatewayContract = null;
  }

  /**
   * async perform
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setAuxWeb3Instance();

    await oThis._fetchCoGatewayContractAddress();

    let response = await oThis._performProgressMint();

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          transactionHash: response.data.transactionHash,
          taskResponseData: { chainId: oThis.auxChainId, transactionHash: response.data.transactionHash }
        })
      );
    } else {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          taskResponseData: JSON.stringify(response)
        })
      );
    }
  }

  /**
   * _setAuxWeb3Instance
   *
   * @return {Promise<void>}
   * @private
   */
  async _setAuxWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.auxChainId]);

    oThis.auxChainConfig = response[oThis.auxChainId];
    oThis.auxWsProviders = oThis.auxChainConfig.auxGeth.readWrite.wsProviders;

    oThis.shuffledProviders = basicHelper.shuffleArray(oThis.auxWsProviders);

    oThis.auxWeb3 = web3Provider.getInstance(oThis.shuffledProviders[0]).web3WsProvider;
  }

  /**
   * Perform Progress Mint
   *
   * @return {Promise<void>}
   * @private
   */
  async _performProgressMint() {
    const oThis = this;

    let contractInteract = new MosaicJs.ContractInteract.EIP20CoGateway(oThis.auxWeb3, oThis.coGatewayContract);

    let unlockSecret = util.generateHashLock(oThis.secretString).unlockSecret,
      txObject = await contractInteract.progressMintRawTx(oThis.messageHash, unlockSecret),
      data = txObject.encodeABI(),
      txOptions = {
        gasPrice: oThis._fetchGasPrice(),
        gas: contractConstants.progressMintGas
      };

    return oThis.performTransaction(
      oThis.auxChainId,
      oThis.shuffledProviders[0],
      oThis.facilitator,
      oThis.coGatewayContract,
      txOptions,
      data
    );
  }

  /**
   * fetch co gateway contract address
   *
   * @private
   */
  _fetchCoGatewayContractAddress() {
    throw 'sub-class to implement';
  }

  /**
   * Fetch gas price
   *
   * @private
   */
  _fetchGasPrice() {
    throw 'sub-class to implement';
  }
}

module.exports = ProgressMintBase;
