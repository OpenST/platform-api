/**
 * Module to get API names.
 *
 * @module lib/globalConstant/apiName
 */

/**
 * Class to get API names.
 *
 * @class ApiName
 */
class ApiName {
  get getToken() {
    return 'getToken';
  }

  get getBaseTokens() {
    return 'getBaseTokens';
  }

  get getUser() {
    return 'getUser';
  }

  get createUser() {
    return 'createUser';
  }

  get getUserList() {
    return 'getUserList';
  }

  get getUserDevices() {
    return 'getUserDevices';
  }

  get getUserDevice() {
    return 'getUserDevice';
  }

  get createUserDevice() {
    return 'createUserDevice';
  }

  get getUserDeviceManager() {
    return 'getUserDeviceManager';
  }

  get activateUser() {
    return 'activateUser';
  }

  get getTokenHolder() {
    return 'getTokenHolder';
  }

  get postAuthorizeDevice() {
    return 'postAuthorizeDevice';
  }

  get postRevokeDevice() {
    return 'postRevokeDevice';
  }

  get postAuthorizeSession() {
    return 'postAuthorizeSession';
  }

  get postRevokeSession() {
    return 'postRevokeSession';
  }

  get postLogoutSessions() {
    return 'postLogoutSessions';
  }

  get executeTransactionFromUser() {
    return 'executeTransactionFromUser';
  }

  get executeTransactionFromCompany() {
    return 'executeTransactionFromCompany';
  }

  get getTransaction() {
    return 'getTransaction';
  }

  get postTokenHolder() {
    return 'postTokenHolder';
  }

  get getUserSessions() {
    return 'getUserSessions';
  }

  get getUserSession() {
    return 'getUserSession';
  }

  get getUserTransactions() {
    return 'getUserTransactions';
  }

  get getUserBalance() {
    return 'getUserBalance';
  }

  get getPricePoints() {
    return 'getPricePoints';
  }

  get getChain() {
    return 'getChain';
  }

  get getUserSalt() {
    return 'salt';
  }

  get getRules() {
    return 'getRules';
  }

  get getRecoveryOwner() {
    return 'getRecoveryOwner';
  }

  get initiateRecovery() {
    return 'initiateRecovery';
  }

  get abortRecovery() {
    return 'abortRecovery';
  }

  get resetRecoveryOwner() {
    return 'resetRecoveryOwner';
  }

  get redemptionList() {
    return 'redemptionList';
  }

  get redemptionGet() {
    return 'redemptionGet';
  }

  get userPendingRecovery() {
    return 'userPendingRecovery';
  }

  // USED FOR ALL INTERNAL ROUTES AS API NAME
  get allInternalRoutes() {
    return 'all-Internal-Routes';
  }

  get getUserInternal() {
    return 'getUserInternal';
  }

  get rotateWebhookSecretInternal() {
    return 'rotateWebhookSecretInternal';
  }

  get deleteWebhookGraceSecretInternal() {
    return 'deleteWebhookGraceSecretInternal';
  }

  // Webhooks API Names start
  get createWebhook() {
    return 'createWebhook';
  }

  // Webhooks API Names start
  get updateWebhook() {
    return 'updateWebhook';
  }

  get deleteWebhook() {
    return 'deleteWebhook';
  }

  get getWebhook() {
    return 'getWebhook';
  }

  get getAllWebhook() {
    return 'getAllWebhook';
  }

  get verifyTokenDomain() {
    return 'verifyTokenDomain';
  }
  // Webhooks API Names end

  // Redemption Products API Names start

  get getRedemptionProduct() {
    return 'getRedemptionProduct';
  }

  get getRedemptionProductsList() {
    return 'getRedemptionProductsList';
  }

  // Redemption Products API Names end
}

module.exports = new ApiName();
