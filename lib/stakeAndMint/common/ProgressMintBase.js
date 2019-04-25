/**
 * Module to progress mint.
 *
 * @module lib/stakeAndMint/common/ProgressMintBase
 */

const MosaicJs = require('@openst/mosaic.js');

const rootPrefix = '../../..',
  StakeAndMintBase = require(rootPrefix + '/lib/stakeAndMint/Base'),
  util = require(rootPrefix + '/lib/util'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

/**
 * Class to progress mint.
 *
 * @class ProgressMintBase
 */
class ProgressMintBase extends StakeAndMintBase {
  /**
   * Constructor to progress mint.
   *
   * @param {object} params
   * @param {number} params.auxChainId: Aux chain Id to prove gateway on.
   * @param {string} params.messageHash: messageHash.
   * @param {string} params.facilitator: Facilitator to help in proving.
   * @param {string} params.secretString: secretString
   * @param {boolean} [params.firstTimeMint]: First time mint or not (optional)
   *
   * @augments StakeAndMintBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.facilitator = params.facilitator;
    oThis.secretString = params.secretString;
    oThis.messageHash = params.messageHash;

    oThis.coGatewayContract = null;
    oThis.shuffledProviders = null;
    oThis.auxWeb3 = null;
  }

  /**
   * Async perform.
   *
   * @return {Promise<any>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._setAuxWeb3Instance();

    await oThis._fetchCoGatewayContractAddress();

    const response = await oThis._performProgressMint();

    if (response.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskPending,
          transactionHash: response.data.transactionHash,
          taskResponseData: { chainId: oThis.auxChainId, transactionHash: response.data.transactionHash }
        })
      );
    }

    return Promise.resolve(
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        taskResponseData: JSON.stringify(response)
      })
    );
  }

  /**
   * Set aux web3 instance.
   *
   * @sets oThis.shuffledProviders, oThis.auxWeb3
   *
   * @return {Promise<void>}
   * @private
   */
  async _setAuxWeb3Instance() {
    const oThis = this;

    const response = await chainConfigProvider.getFor([oThis.auxChainId]);

    const auxChainConfig = response[oThis.auxChainId];
    const auxWsProviders = auxChainConfig.auxGeth.readWrite.wsProviders;

    oThis.shuffledProviders = basicHelper.shuffleArray(auxWsProviders);
    oThis.auxWeb3 = web3Provider.getInstance(oThis.shuffledProviders[0]).web3WsProvider;
  }

  /**
   * Perform progress mint.
   *
   * @return {Promise<void>}
   * @private
   */
  async _performProgressMint() {
    const oThis = this;

    const contractInteract = new MosaicJs.ContractInteract.EIP20CoGateway(oThis.auxWeb3, oThis.coGatewayContract);

    const unlockSecret = util.generateHashLock(oThis.secretString).unlockSecret,
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
   * Fetch co gateway contract address.
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchCoGatewayContractAddress() {
    throw new Error('Sub-class to implement.');
  }

  /**
   * Fetch gas price.
   *
   * @private
   */
  _fetchGasPrice() {
    throw new Error('Sub-class to implement.');
  }
}

module.exports = ProgressMintBase;
