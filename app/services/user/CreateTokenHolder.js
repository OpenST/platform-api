'use strict';

/*
 * This service helps in adding Token User in our System
 */

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser');

class Create extends ServiceBase {
  /**
   * @constructor
   *
   * @param params
   * @param params.client_id              {Number} - client Id
   * @param params.kind              {String} - Kind (Company/User)
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.clientId = params.client_id;
    oThis.kind = params.kind || tokenUserConstants.userKind;

    oThis.shardNumbersMap = {};
  }

  /**
   * Perform - perform user creation
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    return Promise.resolve(responseHelper.successWithData({}));
  }
}

module.exports = {};
