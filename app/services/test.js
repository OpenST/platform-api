"use strict";

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  OSTBase = require("@openstfoundation/openst-base"),
  InstanceComposer = OSTBase.InstanceComposer;

class TestApiClass {

  constructor(params) {
    console.log("params........", params);
  }

  async perform() {
    console.log("here........");
    return responseHelper.successWithData({})
  }

}

InstanceComposer.registerAsShadowableClass(TestApiClass, 'saas::SaasNamespace', 'getTestApiClass');

module.exports = TestApiClass;