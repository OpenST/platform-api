'use strict';

const rootPrefix = '..',
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName');

let getRequestConfig, getRequestRegexes, postRequestConfig, postRequestRegexes;

class ApiAuthentication {
  get getRequestConfig() {
    if (getRequestConfig) {
      return getRequestConfig;
    }
    getRequestConfig = {
      [apiName.getToken]: {
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind],
        route: '/tokens/'
      },
      [apiName.getUserList]: {
        supportedSignatureKinds: [apiSignature.hmacKind],
        route: '/users/'
      },
      [apiName.getUser]: {
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind],
        route: '/users/:user_id/'
      },
      [apiName.getUserDevice]: {
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind],
        route: '/users/:user_id/devices/'
      },
      [apiName.getUserDeviceManager]: {
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind],
        route: '/users/:user_id/device-managers/'
      }
    };
    return getRequestConfig;
  }

  get postRequestConfig() {
    if (postRequestConfig) {
      return postRequestConfig;
    }
    postRequestConfig = {
      [apiName.createUser]: {
        supportedSignatureKinds: [apiSignature.hmacKind],
        route: '/users/'
      },
      [apiName.createUserDevice]: {
        supportedSignatureKinds: [apiSignature.hmacKind],
        route: '/users/:user_id/devices/'
      }
    };
    return postRequestConfig;
  }

  get getRequestsDataExtractionReges() {
    const oThis = this;
    if (getRequestRegexes) {
      return getRequestRegexes;
    }
    getRequestRegexes = oThis.dataExtractionRegexGenerator(oThis.getRequestConfig);
    return getRequestRegexes;
  }

  get postRequestsDataExtractionReges() {
    const oThis = this;
    if (postRequestRegexes) {
      return postRequestRegexes;
    }
    postRequestRegexes = oThis.dataExtractionRegexGenerator(oThis.postRequestConfig);
    return postRequestRegexes;
  }

  dataExtractionRegexGenerator(globalConfig) {
    let config,
      buffer,
      regexes = {};

    for (let apiName in globalConfig) {
      config = globalConfig[apiName];

      buffer = {
        apiName: apiName,
        supportedSignatureKinds: config['supportedSignatureKinds'],
        regExMatches: ['url'],
        regExUrl: '^' + config['route'].replace('/', '/') + '$'
      };

      let dynamicVariables = config['route'].match(RegExp(':([^/]+)', 'gi')) || [];

      for (let i = 0; i < dynamicVariables.length; i++) {
        buffer.regExMatches.push(dynamicVariables[i].replace(':', ''));
        buffer.regExUrl = buffer.regExUrl.replace(dynamicVariables[i], '([^/]+)');
      }

      buffer.regExUrl = new RegExp(buffer.regExUrl);

      regexes[config['route']] = buffer;
    }

    return regexes;
  }
}

module.exports = new ApiAuthentication();