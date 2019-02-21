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

  get postTransaction() {
    return 'postTransaction';
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
}

module.exports = new ApiName();
