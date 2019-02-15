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

  get getUserSessions() {
    return 'getUserSessions';
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
}

module.exports = new ApiName();
