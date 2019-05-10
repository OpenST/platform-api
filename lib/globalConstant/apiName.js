'use strict';

class ApiName {
  get getToken() {
    return 'getToken';
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
}

module.exports = new ApiName();
