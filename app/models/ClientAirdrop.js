'use strict';

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  util = require(rootPrefix + '/lib/util'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base');

const dbName = 'saas_airdrop_' + coreConstants.SUB_ENVIRONMENT + '_' + coreConstants.ENVIRONMENT,
  statuses = {
    '1': 'incomplete',
    '2': 'processing',
    '3': 'completed',
    '4': 'failed'
  },
  stepsComplete = {
    '1': 'userIdentified',
    '2': 'tokensTransfered',
    '4': 'contractApproved',
    '8': 'allocationDone'
  },
  invertedStatuses = util.invert(statuses),
  invertedStepsComplete = util.invert(stepsComplete);

class ClientAirdropModel extends ModelBase{

  constructor() {

    super({ dbName: dbName });

    const oThis = this;

    oThis.setBitColumns();

    oThis.validateBitColumns();

  }

  get tableName(){
    return 'client_airdrops';
  }

  get statuses() {
    return statuses;
  }

  get invertedStatuses() {
    return invertedStatuses;
  }

  get stepsComplete() {
    return stepsComplete;
  }

  get invertedStepsComplete() {
    return invertedStepsComplete;
  }

  get enums() {
    return {
      status: {
        val: statuses,
        inverted: invertedStatuses
      }
    }
  }

  setBitColumns() {
    const oThis = this;

    oThis.bitColumns = { steps_complete: invertedStepsComplete };

    return oThis.bitColumns;
  }
}

module.exports = ClientAirdropModel;
