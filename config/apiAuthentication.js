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
      [apiName.getUserDevices]: {
        supportedSignatureKinds: [apiSignature.hmacKind],
        route: '/users/:user_id/devices/'
      },
      [apiName.getUserDevice]: {
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind],
        route: '/users/:user_id/devices/:device_address/'
      },
      [apiName.getUserDeviceManager]: {
        supportedSignatureKinds: [apiSignature.personalSignKind],
        route: '/users/:user_id/device-managers/'
      },
      [apiName.getUserSessions]: {
        supportedSignatureKinds: [apiSignature.hmacKind],
        route: '/users/:user_id/sessions/'
      },
      [apiName.getUserSession]: {
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind],
        route: '/users/:user_id/sessions/:session_address/'
      },
      [apiName.getPricePoints]: {
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind],
        route: '/price-points/'
      },
      [apiName.getChain]: {
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind],
        route: '/chains/:chain_id/'
      },
      [apiName.getTokenHolder]: {
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind],
        route: '/users/:user_id/token-holders/'
      },
      [apiName.getUserSalt]: {
        supportedSignatureKinds: [apiSignature.personalSignKind],
        route: '/users/:user_id/salts/'
      },
      [apiName.getTransaction]: {
        supportedSignatureKinds: [apiSignature.personalSignKind],
        route: '/users/:user_id/transactions/:transaction_id/'
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
      [apiName.activateUser]: {
        supportedSignatureKinds: [apiSignature.personalSignKind],
        route: '/users/:user_id/activate-user/'
      },
      [apiName.createUserDevice]: {
        supportedSignatureKinds: [apiSignature.hmacKind],
        route: '/users/:user_id/devices/'
      },
      [apiName.postAuthorizeDevice]: {
        supportedSignatureKinds: [apiSignature.personalSignKind],
        route: '/users/:user_id/devices/authorize/'
      },
      [apiName.postAuthorizeSession]: {
        supportedSignatureKinds: [apiSignature.personalSignKind],
        route: '/users/:user_id/sessions/authorize/'
      },
      [apiName.postTransaction]: {
        supportedSignatureKinds: [apiSignature.personalSignKind],
        route: '/users/:user_id/transactions/'
      }
    };
    return postRequestConfig;
  }

  get getRequestsDataExtractionRegex() {
    const oThis = this;
    if (getRequestRegexes) {
      return getRequestRegexes;
    }
    getRequestRegexes = oThis.dataExtractionRegexGenerator(oThis.getRequestConfig);
    return getRequestRegexes;
  }

  get postRequestsDataExtractionRegex() {
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
