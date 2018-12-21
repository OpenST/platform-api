'use strict';

/**
 * This is helper class for deploying contract<br><br>
 *
 * @module lib/chainSetup/helpers/Deploy.js
 */

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

/**
 * Constructor for Deploy helper class
 *
 * @constructor
 */
class DeployHelperKlass {
  /**
   * Constructor
   *
   * @param {object} params
   * @param {string} params.deployerAddr - deployer user address
   * @param {number} params.gas - gas to be used for deployment
   * @param {number} params.gasPrice - gasPrice to be used for deployment
   * @param {object} params.web3Provider - web3Provider to be used
   * @param {object} params.contractBin - contractBin to be used
   * @param {object} params.nonce - nonce to be used
   * @param {object} params.constructorArgs - constructorArgs to be passed to contract's constructor
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.deployerAddr = params['deployerAddr'];
    oThis.gas = params['gas'];
    oThis.gasPrice = params['gasPrice'];
    oThis.web3Provider = params['web3Provider'];
    oThis.contractBin = params['contractBin'];
    oThis.contractAbi = params['contractAbi'];
    oThis.constructorArgs = params['constructorArgs'];
    oThis.nonce = params['nonce'];
  }

  /**
   * Deploy
   *
   * @return {promise}
   *
   */
  async perform() {
    const oThis = this,
      txParams = {
        from: oThis.deployerAddr,
        gas: oThis.gas,
        gasPrice: oThis.gasPrice,
        nonce: oThis.nonce
      };

    const options = {
      data: (oThis.web3Provider.utils.isHexStrict(oThis.contractBin) ? '' : '0x') + oThis.contractBin
    };

    Object.assign(options, txParams);

    if (oThis.constructorArgs) {
      options.arguments = oThis.constructorArgs;
    }

    const contract = new oThis.web3Provider.eth.Contract(
      oThis.contractAbi,
      null, // since addr is not known yet
      options
    );

    const deploy = function() {
      const encodeABI = contract.deploy(options).encodeABI();
      txParams.data = encodeABI;

      return new Promise(function(onResolve, onReject) {
        oThis.web3Provider.eth
          .sendTransaction(txParams)
          .on('transactionHash', function(transactionHash) {
            logger.info('* contract deployment txHash', transactionHash);
            onResolve(transactionHash);
          })
          .on('error', onReject);
      });
    };

    let transactionHash;

    const transactionReceipt = await deploy()
      .then(function(txHash) {
        transactionHash = txHash;
        return oThis.waitAndGetTransactionReceipt(transactionHash);
      })
      .then(function(response) {
        if (!response.isSuccess()) {
          return Promise.reject(response);
        } else {
          return Promise.resolve(response.data.rawTransactionReceipt);
        }
      })
      .catch((reason) => {
        logger.error('reason', reason);
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 't_h_d_1',
            api_error_identifier: 'something_went_wrong',
            debug_options: {}
          })
        );
      });

    logger.info('* Deploy transactionReceipt ::', transactionReceipt);

    const contractAddress = transactionReceipt.contractAddress,
      code = await oThis.web3Provider.eth.getCode(contractAddress);

    if (code.length <= 2) {
      const err = 'Contract deployment failed. Invalid code length for contract';
      logger.error(err);
      return Promise.reject(err);
    }

    // Print summary
    logger.info('Contract Address:', contractAddress);
    logger.info('Gas used:', transactionReceipt.gasUsed);

    return responseHelper.successWithData({
      transactionHash: transactionHash,
      transactionReceipt: transactionReceipt,
      contractAddress: contractAddress
    });
  }

  /**
   * @ignore
   */
  waitAndGetTransactionReceipt(transactionHash) {
    const oThis = this;

    return new Promise(function(onResolve, onReject) {
      const tryReceipt = function() {
        setTimeout(function() {
          oThis.web3Provider.eth.getTransactionReceipt(transactionHash).then(handleResponse);
        }, 5000);
      };

      const handleResponse = function(response) {
        if (response) {
          onResolve(responseHelper.successWithData({ rawTransactionReceipt: response }));
        } else {
          logger.info('Waiting for ' + transactionHash + ' to be mined');
          tryReceipt();
        }
      };

      tryReceipt();
    });
  }
}

module.exports = DeployHelperKlass;
