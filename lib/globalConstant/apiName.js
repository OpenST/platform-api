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

  get createTokenHolder() {
    return 'createTokenHolder';
  }

  get getTokenHolder() {
    return 'getTokenHolder';
  }
}

module.exports = new ApiName();
