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

  get postTokenHolder() {
    return 'postTokenHolder';
  }

  get getUserSessions() {
    return 'getUserSessions';
  }

  get getPricePoints() {
    return 'getPricePoints';
  }

  get getChain() {
    return 'getChain';
  }
}

module.exports = new ApiName();
