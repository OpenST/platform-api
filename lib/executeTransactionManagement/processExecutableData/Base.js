'use strict';

/**
 * Base class to process executable rule data sent by FE
 *
 * @module lib/executeTransactionManagement/processExecutableData/Base
 */

const BigNumber = require('bignumber.js');

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

/**
 * Class
 *
 * @class
 */
class Base {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {Object} params.rawCallData
   * @param {String} params.contractAddress
   * @param {String} params.tokenHolderAddress
   * @param {Object} params.web3Instance
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.rawCallData = params.rawCallData;
    oThis.contractAddress = params.contractAddress;
    oThis.tokenHolderAddress = params.tokenHolderAddress;
    oThis.web3Instance = params.web3Instance;

    oThis.pessimisticDebitAmount = new BigNumber('0');
    oThis.transferExecutableData = null;
    oThis.estimatedTransfers = [];
    oThis.sanitizedToAddresses = [];
    oThis.gas = null;
  }

  /**
   *
   * @return {Promise<result>}
   */
  async perform() {
    const oThis = this;

    await oThis._validateExecutableData();

    await oThis._sanitizeToAddresses();

    await oThis._setPessimisticDebitAmount();

    await oThis._setTransferExecutableData();

    await oThis._setEstimatedTransfers();

    await oThis._setEstimatedGas();

    return responseHelper.successWithData({
      pessimisticDebitAmount: oThis.pessimisticDebitAmount,
      transferExecutableData: oThis.transferExecutableData,
      estimatedTransfers: oThis.estimatedTransfers,
      gas: oThis.gas,
      transferToAddresses: oThis.sanitizedToAddresses
    });
  }

  /**
   * sanitize to addresses
   * @private
   */
  async _sanitizeToAddresses() {
    const oThis = this;

    for (let i = 0; i < oThis.transferToAddresses.length; i++) {
      oThis.sanitizedToAddresses.push(basicHelper.sanitizeAddress(oThis.transferToAddresses[i]));
    }
  }

  /**
   * validate executable data
   * @private
   */
  _validateExecutableData() {
    throw 'sub class to implement';
  }

  /**
   * set pessimistic debit amount
   * @private
   */
  _setPessimisticDebitAmount() {
    throw 'sub class to implement to set oThis.pessimisticDebitAmount';
  }

  /**
   * set executable data which would be used in transaction
   * @private
   */
  _setTransferExecutableData() {
    throw 'sub class to implement to set oThis.transferExecutableData';
  }

  /**
   * set estimated transfers obj
   * @private
   */
  _setEstimatedTransfers() {
    throw 'sub class to implement to set oThis.estimatedTransfers';
  }

  /**
   * set estimated gas for this transaction depending on no. of transfers
   * @private
   */
  _setEstimatedGas() {
    throw 'sub class to implement to set oThis.gas';
  }

  /**
   * rawCallDataMethod
   * @private
   */
  get rawCallDataMethod() {
    const oThis = this;
    return oThis.rawCallData.method;
  }

  /**
   * rawCallDataParams
   * @private
   */
  get rawCallDataParams() {
    const oThis = this;
    return oThis.rawCallData.parameters;
  }

  /**
   *
   * @param {string} code
   * @param {array} paramErrors
   * @param {object} debugOptions
   *
   * @return {Promise}
   */
  _validationError(code, paramErrors, debugOptions) {
    const oThis = this;
    return Promise.reject(
      responseHelper.paramValidationError({
        internal_error_identifier: code,
        api_error_identifier: 'invalid_params',
        params_error_identifiers: paramErrors,
        debug_options: debugOptions
      })
    );
  }
}

module.exports = Base;
