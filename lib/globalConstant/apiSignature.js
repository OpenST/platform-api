'use strict';

let supportedKinds, getRequestConfig, postRequestConfig;

class ApiSignature {
  get getRequestKind() {
    return 'GET';
  }

  get postRequestKind() {
    return 'POST';
  }

  get hmacKind() {
    return 'OST1-HMAC-SHA256';
  }

  get personalSignKind() {
    return 'OST1-PS';
  }

  get personalSignApiKeySeparator() {
    return '.';
  }

  get supportedKinds() {
    const oThis = this;
    if (supportedKinds) {
      return supportedKinds;
    }
    supportedKinds = [oThis.hmacKind, oThis.personalSignKind];
    return supportedKinds;
  }

  get getRequestsConfig() {
    const oThis = this;
    if (getRequestConfig) {
      return getRequestConfig;
    }
    getRequestConfig = [oThis.hmacKind, oThis.personalSignKind];
    return getRequestConfig;
  }

  /**
   * Signature validity
   *
   * @return {number}
   */
  get signatureValidity() {
    return 100;
  }
}

module.exports = new ApiSignature();
