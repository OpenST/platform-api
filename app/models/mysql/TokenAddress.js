'use strict';

/**
 * This is model for workflow_setup table.
 *
 * @module app/models/mysql/WorkflowStep
 */
const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment,
  kinds = {
    '1': tokenAddressConstants.ownerAddressKind,
    '2': tokenAddressConstants.adminAddressKind,
    '3': tokenAddressConstants.workerAddressKind,

    //Contract Kinds
    '51': tokenAddressConstants.originOrganizationContract,
    '52': tokenAddressConstants.auxOrganizationContract,
    '53': tokenAddressConstants.brandedTokenContract,
    '54': tokenAddressConstants.utilityBrandedTokenContract,
    '55': tokenAddressConstants.tokenGatewayContract,
    '56': tokenAddressConstants.tokenCoGatewayContract
  },
  invertedKinds = util.invert(kinds);

class TokenAddress extends ModelBase {
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'token_addresses';
  }

  get kinds() {
    return kinds;
  }

  get invertedKinds() {
    return invertedKinds;
  }
}

module.exports = TokenAddress;
