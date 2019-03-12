/**
 * Transfer ST Prime
 *
 * @module lib/fund/stPrime/BatchTransfer
 */

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  TransferStPrime = require(rootPrefix + '/lib/fund/stPrime/Transfer');

const BATCH_SIZE = 5;

class BatchTransfer {
  /**
   * @constructor
   *
   * @param {Object} params
   * @param {Integer} params.auxChainId
   * @param {Array} params.transferDetails - [{fromAddress:'', toAddress: '', amountInWei:''},{fromAddress:'', toAddress: '', amountInWei:''}]
   * @param {Integer} params.handleSigint - 1 if need to handle sigint.
   */
  constructor(params) {
    const oThis = this;
    oThis.auxChainId = params.auxChainId;
    oThis.transferDetails = params.transferDetails;
    oThis.handleSigint = params.handleSigint;
    oThis.sigintReceived = 0;
  }

  /**
   * Perform
   *
   * @returns {Promise}
   */
  async perform() {
    const oThis = this;
    const transferTransactionHashes = {};

    let promiseArray = [];

    await oThis.sigintHandler();

    for (let index = 0; index < oThis.transferDetails.length; index++) {
      const transferD = oThis.transferDetails[index];
      promiseArray.push(
        new TransferStPrime({
          auxChainId: oThis.auxChainId,
          fromAddress: transferD.fromAddress,
          toAddress: transferD.toAddress,
          amountInWei: transferD.amountInWei,
          waitTillReceipt: 1
        })
          .perform()
          .then(function(transferResponse) {
            if (transferResponse.isSuccess()) {
              const tResponse = transferResponse.data;
              transferTransactionHashes[transferD.toAddress] = tResponse.transactionHash;
            }
          })
          .catch(function(err) {
            logger.error('Error.......', err);
          })
      );

      await basicHelper.sleep(1000);

      if (promiseArray.length >= BATCH_SIZE || oThis.transferDetails.length === index + 1) {
        await Promise.all(promiseArray);
        promiseArray = [];
      }

      if (oThis.sigintReceived) {
        break;
      }
    }

    return responseHelper.successWithData(transferTransactionHashes);
  }

  /**
   * SigInt Handler.
   *
   * @returns {Promise<void>}
   */
  async sigintHandler() {
    const oThis = this;

    if (!oThis.handleSigint) {
      return;
    }

    function handle() {
      logger.info('======= Sigint received =======');
      oThis.sigintReceived = 1;
    }
    process.on('SIGINT', handle);
    process.on('SIGTERM', handle);
  }
}

module.exports = BatchTransfer;
