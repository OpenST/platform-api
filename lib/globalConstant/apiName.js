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

  get postTokenHolder() {
    return 'postTokenHolder';
  }

  get getUserSessions() {
    return 'getUserSessions';
  }

  get getPricePoints() {
    return 'getPricePoints';
  }
}

module.exports = new ApiName();
