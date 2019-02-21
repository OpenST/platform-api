'use strict';
/**
 * This service helps in executing transaction for a user
 *
 * @module app/services/user/ExecuteTransaction
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

const uuid = require('uuid');

/**
 * Class to Execute transaction
 *
 * @class
 */
class ExecuteTransaction extends ServiceBase {
  /**
   * Constructor for execute transaction
   *
   * @param params
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
  }

  /**
   * perform - perform user creation
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    return Promise.resolve(
      responseHelper.successWithData({
        [resultType.transaction]: {
          id: uuid.v4()
        }
      })
    );
  }
}

InstanceComposer.registerAsShadowableClass(ExecuteTransaction, coreConstants.icNameSpace, 'ExecuteTransaction');

module.exports = {};
