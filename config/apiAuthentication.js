'use strict';

const rootPrefix = '..',
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName');

let getRequestConfigData, getRequestRegexes, postRequestConfigData, postRequestRegexes;

class ApiAuthentication {
  /**
   * get requests regexes & config
   * @return {Array}
   */
  get getRequestsDataExtractionRegex() {
    const oThis = this;
    if (getRequestRegexes) {
      return getRequestRegexes;
    }
    getRequestRegexes = oThis._dataExtractionRegexGenerator(oThis._getRequestConfig);
    return getRequestRegexes;
  }

  /**
   * post requests regexes & config
   * @return {Array}
   */
  get postRequestsDataExtractionRegex() {
    const oThis = this;
    if (postRequestRegexes) {
      return postRequestRegexes;
    }
    postRequestRegexes = oThis._dataExtractionRegexGenerator(oThis._postRequestConfig);
    return postRequestRegexes;
  }

  get _getRequestConfig() {
    if (getRequestConfigData) {
      return getRequestConfigData;
    }

    getRequestConfigData = [
      {
        apiName: apiName.getChain,
        route: '/chains/:chain_id/',
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind]
      },
      {
        apiName: apiName.getPricePoints,
        route: '/chains/:chain_id/price-points/',
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind]
      },
      {
        apiName: apiName.getToken,
        route: '/tokens/',
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind]
      },
      {
        apiName: apiName.getRules,
        route: '/rules/',
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind]
      },
      {
        apiName: apiName.getUserList,
        route: '/users/',
        supportedSignatureKinds: [apiSignature.hmacKind]
      },
      {
        apiName: apiName.getUser,
        route: '/users/:user_id/',
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind]
      },
      {
        apiName: apiName.getUserDevices,
        route: '/users/:user_id/devices/',
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind]
      },
      {
        apiName: apiName.getUserDevice,
        route: '/users/:user_id/devices/:device_address/',
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind]
      },
      {
        apiName: apiName.userPendingRecovery,
        route: '/users/:user_id/devices/pending-recovery/',
        supportedSignatureKinds: [apiSignature.personalSignKind]
      },
      {
        apiName: apiName.getUserDeviceManager,
        route: '/users/:user_id/device-managers/',
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind]
      },
      {
        apiName: apiName.getUserSessions,
        route: '/users/:user_id/sessions/',
        supportedSignatureKinds: [apiSignature.hmacKind]
      },
      {
        apiName: apiName.getUserSession,
        route: '/users/:user_id/sessions/:session_address/',
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind]
      },
      {
        apiName: apiName.getUserSalt,
        route: '/users/:user_id/salts/',
        supportedSignatureKinds: [apiSignature.personalSignKind]
      },
      {
        apiName: apiName.getTransaction,
        route: '/users/:user_id/transactions/:transaction_id/',
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind]
      },
      {
        apiName: apiName.getUserTransactions,
        route: '/users/:user_id/transactions/',
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind]
      },
      {
        apiName: apiName.getUserBalance,
        route: '/users/:user_id/balance/',
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind]
      },
      {
        apiName: apiName.getRecoveryOwner,
        route: '/users/:user_id/recovery-owners/:recovery_owner_address/',
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind]
      }
      // Note: - Urls should end with a slash. Add config above this.
    ];
    return getRequestConfigData;
  }

  get _postRequestConfig() {
    if (postRequestConfigData) {
      return postRequestConfigData;
    }
    postRequestConfigData = [
      {
        apiName: apiName.createUser,
        route: '/users/',
        supportedSignatureKinds: [apiSignature.hmacKind]
      },
      {
        apiName: apiName.activateUser,
        route: '/users/:user_id/activate-user/',
        supportedSignatureKinds: [apiSignature.personalSignKind]
      },
      {
        apiName: apiName.createUserDevice,
        route: '/users/:user_id/devices/',
        supportedSignatureKinds: [apiSignature.hmacKind]
      },
      {
        apiName: apiName.postAuthorizeDevice,
        route: '/users/:user_id/devices/authorize/',
        supportedSignatureKinds: [apiSignature.personalSignKind]
      },
      {
        apiName: apiName.postRevokeDevice,
        route: '/users/:user_id/devices/revoke/',
        supportedSignatureKinds: [apiSignature.personalSignKind]
      },
      {
        apiName: apiName.initiateRecovery,
        route: '/users/:user_id/devices/initiate-recovery/',
        supportedSignatureKinds: [apiSignature.personalSignKind]
      },
      {
        apiName: apiName.abortRecovery,
        route: '/users/:user_id/devices/abort-recovery/',
        supportedSignatureKinds: [apiSignature.personalSignKind]
      },
      {
        apiName: apiName.postAuthorizeSession,
        route: '/users/:user_id/sessions/authorize/',
        supportedSignatureKinds: [apiSignature.personalSignKind]
      },
      {
        apiName: apiName.postRevokeSession,
        route: '/users/:user_id/sessions/revoke/',
        supportedSignatureKinds: [apiSignature.personalSignKind]
      },
      {
        apiName: apiName.executeTransactionFromUser,
        route: '/users/:user_id/transactions/',
        supportedSignatureKinds: [apiSignature.personalSignKind]
      },
      {
        apiName: apiName.executeTransactionFromCompany,
        route: '/users/:user_id/transactions/',
        supportedSignatureKinds: [apiSignature.hmacKind]
      },
      {
        apiName: apiName.resetRecoveryOwner,
        route: '/users/:user_id/recovery-owners/',
        supportedSignatureKinds: [apiSignature.personalSignKind]
      }
      // Note: - Urls should end with a slash. Add config above this.
    ];
    return postRequestConfigData;
  }

  /**
   *
   * from the config passed create data which would be used for regex matches later
   *
   * @param globalConfig
   * @return {Array}
   */
  _dataExtractionRegexGenerator(globalConfig) {
    let config,
      buffer,
      regexes = [];

    for (let apiIndex = 0; apiIndex < globalConfig.length; apiIndex++) {
      config = globalConfig[apiIndex];

      buffer = {
        apiName: config.apiName,
        url: config.route,
        supportedSignatureKinds: config.supportedSignatureKinds,
        regExMatches: ['url'],
        regExUrl: '^' + config.route + '$'
      };

      let dynamicVariables = config.route.match(RegExp(':([^/]+)', 'gi')) || [];

      for (let i = 0; i < dynamicVariables.length; i++) {
        buffer.regExMatches.push(dynamicVariables[i].replace(':', ''));
        buffer.regExUrl = buffer.regExUrl.replace(dynamicVariables[i], '([^/]+)');
      }

      buffer.regExUrl = new RegExp(buffer.regExUrl, 'i');

      regexes.push(buffer);
    }

    return regexes;
  }
}

module.exports = new ApiAuthentication();
