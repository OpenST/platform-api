'use strict';

/*
 * JWT implementation
 *
 * * Author: Kedar
 * * Date: 25/01/2018
 * * Reviewed by:
 */

const jwt = require('jsonwebtoken');

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants');

class JwtAuth {

  constructor() {}

  // Issue new token
  static issueToken(data, keyType) {
    const oThis = this;
    const payload = { data: data },
      jwtOptions = { expiresIn: 60 * 5 };

    return jwt.sign(payload, oThis.getKeyFor(keyType), jwtOptions);
  }

  // Verify token
  static verifyToken(token, keyType) {
    const oThis = this;
    return new Promise(function(onResolve, onReject) {
      var jwtCB = function(err, decodedToken) {
        if (err) {
          onReject(err);
        } else {
          onResolve(decodedToken);
        }
      };

      jwt.verify(token, oThis.getKeyFor(keyType), {}, jwtCB);
    });
  }

  static getKeyFor(keyType) {
    return keyType == 'saasApi' ? coreConstants.SAAS_API_SECRET_KEY : '';
  }

}

module.exports = JwtAuth;
