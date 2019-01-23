'use strict';

const rootPrefix = '../../..',
  apiSignature = require(rootPrefix + '/lib/globalConstant/apiSignature');

const v2ErrorConfig = {
  invalid_status_transactions_ledger: {
    parameter: 'status',
    code: 'invalid',
    message: 'status should have comma seperated status filters (eg: processing,waiting_for_mining,complete,failed)'
  },
  invalid_signature_kind: {
    parameter: 'signature_kind',
    code: 'invalid',
    message: `List of supported signature kinds (${apiSignature.hmacKind})`
  }
};

module.exports = v2ErrorConfig;
