'use strict';

const signature = {
  verifySigner: {
    mandatory: [
      {
        parameter: 'signer',
        error_identifier: 'missing_signer'
      },
      {
        parameter: 'personal_sign',
        error_identifier: 'missing_personal_sign'
      },
      {
        parameter: 'message_to_sign',
        error_identifier: 'missing_message_to_sign'
      }
    ],
    optional: []
  }
};

module.exports = signature;
