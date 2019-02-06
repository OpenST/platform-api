'use strict';

/*
 * This service helps in adding Token User in our System
 */

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  OSTBase = require('@openstfoundation/openst-base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  shardConst = require(rootPrefix + '/lib/globalConstant/shard'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  shardConstant = require(rootPrefix + '/lib/globalConstant/shard'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  tokenUserConstants = require(rootPrefix + '/lib/globalConstant/tokenUser');

const uuidv4 = require('uuid/v4'),
  InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/lib/cacheManagement/shared/AvailableShard');
require(rootPrefix + '/lib/cacheManagement/chain/TokenShardNumber');
require(rootPrefix + '/app/models/ddb/sharded/User');

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
    return Promise.resolve(responseHelper.successWithData());
  }
}

InstanceComposer.registerAsShadowableClass(Create, coreConstants.icNameSpace, 'CreateTokenHolder');

module.exports = {};
