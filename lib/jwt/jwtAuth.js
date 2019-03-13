'use strict';

/**
 * JWT Auth
 *
 * @module lib/jwt/jwtAuth
 */
const jwt = require('jsonwebtoken');

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants');

class JwtAuth {
  /**
   * @constructor
   */
  constructor() {}

  // Issue new token
  static issueToken(data, keyType) {
    const oThis = this;
    const payload = { data: data },
      jwtOptions = { expiresIn: 60 * 5 };

    return jwt.sign(payload, oThis.getKeyFor(keyType), jwtOptions);
  }

  /**
   * Verify token
   *
   * @param token {string} - jwt token
   * @param keyType {string} - key type
   *
   * @return {Promise<any>}
   */
  static verifyToken(token, keyType) {
    const oThis = this;
    return new Promise(function(onResolve, onReject) {
      let jwtCB = function(err, decodedToken) {
        if (err) {
          onReject(err);
        } else {
          onResolve(decodedToken);
        }
      };

      jwt.verify(token, oThis.getKeyFor(keyType), {}, jwtCB);
    });
  }

  /**
   * Get key for
   *
   * @param keyType {string} - key type
   * @return {string}
   */
  static getKeyFor(keyType) {
    return keyType === 'saasApi' ? coreConstants.INTERNAL_API_SECRET_KEY : '';
  }
}

module.exports = JwtAuth;
