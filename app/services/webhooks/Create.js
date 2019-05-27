'use strict';
/**
 * This service helps in adding new webhook in our System
 *
 * @module app/services/webhooks/Create
 */

const uuidV4 = require('uuid/v4'),
  OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType'),
  WebhookEndpointModel = require(rootPrefix + '/app/models/mysql/WebhookEndpoint');

class Create extends ServiceBase {
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.clientId = params.clientId;
  }
}

InstanceComposer.registerAsShadowableClass(Create, coreConstants.icNameSpace, 'CreateUser');

module.exports = {};
