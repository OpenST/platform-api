/**
 * Module to get API signatures.
 *
 * @module lib/globalConstant/apiSignature
 */

let supportedKinds;

/**
 * Class to get API signatures.
 *
 * @class ApiSignature
 */
class ApiSignature {
  get getRequestKind() {
    return 'GET';
  }

  get postRequestKind() {
    return 'POST';
  }

  get deleteRequestKind() {
    return 'DELETE';
  }

  get hmacKind() {
    return 'OST1-HMAC-SHA256';
  }

  get personalSignKind() {
    return 'OST1-PS';
  }

  get noAuthKind() {
    return 'NO-AUTH';
  }

  get personalSignApiKeySeparator() {
    return '.';
  }

  get supportedKinds() {
    const oThis = this;

    if (supportedKinds) {
      return supportedKinds;
    }
    supportedKinds = [oThis.hmacKind, oThis.personalSignKind, oThis.noAuthKind];

    return supportedKinds;
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
