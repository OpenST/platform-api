'use strict';

const MosaicTbd = require('@openstfoundation/mosaic-tbd'),
  abiDecoder = require('abi-decoder');

const rootPrefix = '../../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

class FetchStakeIntentMessageHash {
  constructor(params) {
    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.transactionHash = params.transactionHash;

    oThis.web3Instance = null;
  }

  /**
   * perform
   *
   * @return {Promise|*|Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_smm_fsimh_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * _asyncPerform
   *
   * @return {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    // If contract addresses are not found
    if (!oThis.transactionHash) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_smm_fsimh_2',
          api_error_identifier: 'contract_not_found',
          debug_options: {}
        })
      );
    }

    await oThis._setOriginWeb3Instance();

    let resp = await oThis._getMessageHashFromReceipt(oThis.transactionHash);
    if (resp.isSuccess()) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskDone,
          taskResponseData: resp.data,
          feResponseData: { amountMinted: resp.data.amountMinted }
        })
      );
    } else {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed,
          taskResponseData: JSON.stringify(resp)
        })
      );
    }
  }

  /**
   * Set web3 instance.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _setOriginWeb3Instance() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.originChainId]);

    let originChainConfig = response[oThis.originChainId];
    let originWsProviders = originChainConfig.originGeth.readWrite.wsProviders;

    oThis.web3Instance = web3Provider.getInstance(originWsProviders[0]).web3WsProvider;
  }

  /**
   * @param txHash - transactionHash
   *
   * @return {Promise<any>}
   * @private
   */
  async _getMessageHashFromReceipt(txHash) {
    const oThis = this;

    oThis._addABI();

    let txReceipt = await oThis.web3Instance.eth.getTransactionReceipt(txHash);

    if (!txReceipt) {
      logger.error('Unable to fetch transaction receipt from chain.');
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_smm_fsimh_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    let decodedEvents = abiDecoder.decodeLogs(txReceipt.logs);

    for (let index = 0; index < decodedEvents.length; index++) {
      let event = decodedEvents[index];
      if (event !== undefined && event instanceof Object) {
        if (event.name === 'StakeIntentDeclared') {
          logger.debug(event);
          let ed = { blockNumber: txReceipt.blockNumber, transactionHash: oThis.transactionHash };
          for (let i = 0; i < event.events.length; i++) {
            let eventData = event.events[i];
            if (eventData.name == '_messageHash') {
              ed['messageHash'] = eventData.value;
            }
            if (eventData.name == '_amount') {
              ed['amountMinted'] = eventData.value;
            }
          }
          return Promise.resolve(responseHelper.successWithData(ed));
        }
      }
    }

    logger.error('No event found for StakeIntentDeclared.');
    return Promise.resolve(
      responseHelper.error({
        internal_error_identifier: 'l_smm_fsimh_4',
        api_error_identifier: 'something_went_wrong',
        debug_options: {}
      })
    );
  }

  /**
   * This function fetches abi for gateway contract and adds the abi to abiDecoder.
   *
   * @private
   */
  _addABI() {
    const oThis = this;

    let abi = oThis.MosaicBinProvider.getABI(oThis.gatewayContractName);
    // Initialize decoder with abi.
    abiDecoder.addABI(abi);
  }

  /**
   * This function fetches mosaic bin provider.
   *
   * @returns {Provider}
   */
  get MosaicBinProvider() {
    return new MosaicTbd.AbiBinProvider();
  }

  /**
   * This function gets the eip20 gateway contract name.
   *
   * @returns {String}
   */
  get gatewayContractName() {
    return 'EIP20Gateway';
  }
}

module.exports = FetchStakeIntentMessageHash;
