'use strict';
/**
 * This service executes Company To User Transaction
 *
 * @module app/services/executeTransaction/FromCompany
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ExecuteTxBase = require(rootPrefix + '/app/services/executeTransaction/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

/**
 * Class
 *
 * @class
 */
class ExecuteTxFromCompany extends ExecuteTxBase {
  /**
   * Constructor
   *
   * @constructor
   */
  constructor(params) {
    super();
    const oThis = this;
    oThis.clientId = params.client_id;
  }

  /**
   * asyncPerform
   *
   * @return {Promise<any>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._validateAndSanitize();

    await oThis._initializeVars();

    await oThis._processExecutableData();

    await oThis._setSessionAddress();

    await oThis._setNonce();

    await oThis._setSignature();

    await oThis._performPessimisticDebit();

    await oThis._createPendingTransaction();

    await oThis._publishToRMQ();

    return Promise.resolve(
      responseHelper.successWithData({
        transactionUuid: oThis.transactionUuid //TODO: To change after discussions
      })
    );
  }

  /**
   *
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;
  }

  /**
   *
   * @private
   */
  _setTokenHolderAddress() {
    const oThis = this;
    oThis.tokenHolderAddress = oThis.userData.tokenHolderAddress;
  }

  /**
   *
   * @private
   */
  _setSessionAddress() {}

  /**
   *
   * @private
   */
  _setNonce() {}

  _setSignature() {
    const oThis = this;
    oThis.signatureData = {};
  }
}

InstanceComposer.registerAsShadowableClass(ExecuteCompanyToUserTx, coreConstants.icNameSpace, 'ExecuteTxFromCompany');

module.exports = {};
