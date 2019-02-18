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

    return Promise.resolve(responseHelper.successWithData({}));
  }
}

InstanceComposer.registerAsShadowableClass(ExecuteCompanyToUserTx, coreConstants.icNameSpace, 'ExecuteTxFromCompany');

module.exports = {};
