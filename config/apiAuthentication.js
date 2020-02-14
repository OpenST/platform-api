/**
 * Module to determine authentication types for APIs.
 *
 * @module config/apiAuthentication
 */

const rootPrefix = '..',
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature'),
  apiName = require(rootPrefix + '/lib/globalConstant/apiName');

let getRequestConfigData,
  getRequestRegexes,
  postRequestConfigData,
  postRequestRegexes,
  deleteRequestConfigData,
  deleteRequestRegexes;

/**
 * Class to determine authentication types for APIs.
 *
 * @class ApiAuthentication
 */
class ApiAuthentication {
  /**
   * Get requests regexes & config
   *
   * @return {array}
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
   * Post requests regexes & config
   *
   * @return {array}
   */
  get postRequestsDataExtractionRegex() {
    const oThis = this;

    if (postRequestRegexes) {
      return postRequestRegexes;
    }
    postRequestRegexes = oThis._dataExtractionRegexGenerator(oThis._postRequestConfig);

    return postRequestRegexes;
  }

  /**
   * Delete requests regexes & config
   *
   * @return {array}
   */
  get deleteRequestsDataExtractionRegex() {
    const oThis = this;

    if (deleteRequestRegexes) {
      return deleteRequestRegexes;
    }
    deleteRequestRegexes = oThis._dataExtractionRegexGenerator(oThis._deleteRequestConfig);

    return deleteRequestRegexes;
  }

  /**
   * Get request config.
   *
   * @returns {array}
   * @private
   */
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
        apiName: apiName.getBaseTokens,
        route: '/base-tokens/',
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
        apiName: apiName.getTokenHolder,
        route: '/users/:user_id/token-holder/',
        supportedSignatureKinds: [apiSignature.personalSignKind]
      },
      {
        apiName: apiName.getUserDevices,
        route: '/users/:user_id/devices/',
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind]
      },
      {
        apiName: apiName.userPendingRecovery,
        route: '/users/:user_id/devices/pending-recovery/',
        supportedSignatureKinds: [apiSignature.personalSignKind]
      },
      {
        apiName: apiName.getUserDevice,
        route: '/users/:user_id/devices/:device_address/',
        supportedSignatureKinds: [apiSignature.hmacKind, apiSignature.personalSignKind]
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
      },
      {
        apiName: apiName.getWebhook,
        route: '/webhooks/:webhook_id/',
        supportedSignatureKinds: [apiSignature.hmacKind]
      },
      {
        apiName: apiName.getAllWebhook,
        route: '/webhooks/',
        supportedSignatureKinds: [apiSignature.hmacKind]
      }
      // Note: - Urls should end with a slash. Add config above this.
    ];

    return getRequestConfigData;
  }

  /**
   * Post request config.
   *
   * @returns {array}
   * @private
   */
  get _postRequestConfig() {
    if (postRequestConfigData) {
      return postRequestConfigData;
    }
    postRequestConfigData = [
      {
        apiName: apiName.createUser,
        route: '/users/',
        supportedSignatureKinds: [apiSignature.hmacKind],
        disableReplayAttackCheck: 1
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
        apiName: apiName.postLogoutSessions,
        route: '/users/:user_id/token-holder/logout/',
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
      },
      {
        apiName: apiName.redemptionList,
        route: '/users/:user_id/redemptions/',
        supportedSignatureKinds: [apiSignature.personalSignKind]
      },
      {
        apiName: apiName.redemptionGet,
        route: '/users/:user_id/redemptions/:user_redemption_uuid',
        supportedSignatureKinds: [apiSignature.personalSignKind]
      },
      {
        apiName: apiName.createWebhook,
        route: '/webhooks/',
        supportedSignatureKinds: [apiSignature.hmacKind]
      },
      {
        apiName: apiName.updateWebhook,
        route: '/webhooks/:webhook_id/',
        supportedSignatureKinds: [apiSignature.hmacKind]
      }
      // Note: - Urls should end with a slash. Add config above this.
    ];

    return postRequestConfigData;
  }

  /**
   * Delete request config.
   *
   * @returns {array}
   * @private
   */
  get _deleteRequestConfig() {
    if (deleteRequestConfigData) {
      return deleteRequestConfigData;
    }
    deleteRequestConfigData = [
      {
        apiName: apiName.deleteWebhook,
        route: '/webhooks/:webhook-id/',
        supportedSignatureKinds: [apiSignature.hmacKind]
      }
      // Note: - Urls should end with a slash. Add config above this.
    ];

    return deleteRequestConfigData;
  }

  /**
   * From the config passed create data which would be used for regex matches later.
   *
   * @param {array} globalConfig
   *
   * @return {array}
   */
  _dataExtractionRegexGenerator(globalConfig) {
    const regexes = [];

    for (let apiIndex = 0; apiIndex < globalConfig.length; apiIndex++) {
      const config = globalConfig[apiIndex];

      const buffer = {
        apiName: config.apiName,
        url: config.route,
        supportedSignatureKinds: config.supportedSignatureKinds,
        regExMatches: ['url'],
        regExUrl: '^' + config.route + '$',
        disableReplayAttackCheck: config.disableReplayAttackCheck
      };

      const dynamicVariables = config.route.match(RegExp(':([^/]+)', 'gi')) || [];

      for (let index = 0; index < dynamicVariables.length; index++) {
        buffer.regExMatches.push(dynamicVariables[index].replace(':', ''));
        buffer.regExUrl = buffer.regExUrl.replace(dynamicVariables[index], '([^/]+)');
      }

      buffer.regExUrl = new RegExp(buffer.regExUrl, 'i');

      regexes.push(buffer);
    }

    return regexes;
  }
}

module.exports = new ApiAuthentication();
