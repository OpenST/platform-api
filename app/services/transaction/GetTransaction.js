'use strict';
/**
 * This service helps in fetching transaction for a user
 *
 * @module app/services/transaction/GetTransaction
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  ServiceBase = require(rootPrefix + '/app/services/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

/**
 * Class to Get transaction
 *
 * @class
 */
class GetTransaction extends ServiceBase {
  /**
   * Constructor for execute transaction
   *
   * @param params
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.transaction_id = params.transaction_id;
  }

  /**
   * perform - perform user creation
   *
   * @return {Promise<void>}
   */
  async _asyncPerform() {
    const oThis = this;

    let status = null;
    if (Date.now() % 9 == 0 || Date.now() % 6 == 0) {
      status = 'SUCCESS';
    }

    return Promise.resolve(
      responseHelper.successWithData({
        [resultType.transaction]: {
          id: oThis.transaction_id,
          from: '0x34de04328e40be60f0bce5d23b6462418a7ac444',
          to: '0x34de04328e40be60f0bce5d23b6462418a7ac455',
          nonce: '4',
          value: '0x0',
          gasPrice: '100000000000',
          gasUsed: '12345678',
          transactionFee: '213123213',
          finalized: true,
          updatedTimestamp: '1550734448',
          blockTimestamp: '1550734434',
          transactionHash: '0xf5e68c17809717622485ea99b74fb3e5e54da2144c7cc15ea950b8f37366e76e',
          blockNumber: 1234,
          ruleName: 'Kuchbhi',
          transfers: [],
          metaProperty: {},
          status: status
        }
      })
    );
  }
}

InstanceComposer.registerAsShadowableClass(GetTransaction, coreConstants.icNameSpace, 'GetTransaction');

module.exports = {};
