'use strict';

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

class TestApiClass {
  constructor(params) {}

  async perform() {
    return responseHelper.successWithData({});
  }
}

InstanceComposer.registerAsShadowableClass(TestApiClass, coreConstants.icNameSpace, 'getTestApiClass');

module.exports = TestApiClass;
