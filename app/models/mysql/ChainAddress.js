'use strict';

const rootPrefix = '../../..',
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress');

const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

/**
 * Class for chain address model.
 *
 * @class
 */
class ChainAddress extends ModelBase {
  /**
   * Constructor for chain address model.
   *
   * @augments ModelBase
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'chain_addresses';
  }

  /**
   * Insert address
   *
   * @param {Object} params: external passed parameters
   * @param {Integer} params.associatedAuxChainId: associatedAuxChainId
   * @param {String} params.addressKind: address kind
   * @param {String} params.address: address
   * @param {Integer} params.knownAddressId: knownAddressId
   * @param {Integer} params.deployedChainId: deployedChainId
   * @param {String} params.deployedChainKind: deployedChainKind
   * @param {String} params.status: status
   *
   * @return {Promise}
   */
  async insertAddress(params) {
    const oThis = this,
      associatedAuxChainId = params['associatedAuxChainId'],
      addressKind = params['addressKind'],
      address = params['address'],
      knownAddressId = params['knownAddressId'],
      deployedChainId = params['deployedChainId'],
      deployedChainKind = params['deployedChainKind'],
      status = params['status'];

    if (!associatedAuxChainId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_m_ca_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    const addressKindInt = chainAddressConst.invertedKinds[addressKind];
    if (!addressKindInt) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_m_ca_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    if (!address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_m_ca_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    const statusInt = chainAddressConst.invertedStatuses[status];
    if (!statusInt) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_m_ca_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    const deployedChainKindInt = chainAddressConst.deployedChainKinds[deployedChainKind];

    if (chainAddressConst.nonUniqueKinds.indexOf(addressKind) === -1) {
      let whereClause = ['associated_aux_chain_id = ? AND kind = ?', associatedAuxChainId, addressKindInt];

      let existingRows = await oThis
        .select('*')
        .where(whereClause)
        .fire();

      if (existingRows.length > 0) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'm_m_ca_5',
            api_error_identifier: 'duplicate_entry',
            debug_options: {}
          })
        );
      }
    }

    let insertParams = {
      associated_aux_chain_id: associatedAuxChainId,
      deployed_chain_id: deployedChainId,
      deployed_chain_kind: deployedChainKindInt,
      kind: addressKindInt,
      known_address_id: knownAddressId,
      status: statusInt,
      address: address.toLowerCase()
    };

    let insertedRec = await oThis.insert(insertParams).fire();

    if (insertedRec.affectedRows === 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_m_ca_6',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({ chainAddressId: insertedRec.id });
  }

  /**
   * Update status of address.
   *
   * @param {Object} params: external passed parameters
   * @param {Integer} params.associatedAuxChainId: associatedAuxChainId
   * @param {String} params.addressKind: address kind
   * @param {String} params.status: status
   *
   * @param params
   */
  async updateStatus(params) {
    const oThis = this,
      associatedAuxChainId = params['associatedAuxChainId'],
      addressKind = params['addressKind'],
      status = params['status'],
      statusInt = chainAddressConst.invertedStatuses[status],
      addressKindInt = chainAddressConst.invertedKinds[addressKind];

    if (!associatedAuxChainId) {
      if (associatedAuxChainId != 0) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'm_m_ca_7',
            api_error_identifier: 'something_went_wrong',
            debug_options: {}
          })
        );
      }
    }

    if (!statusInt) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_m_ca_8',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    if (!addressKindInt) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_m_ca_9',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    let updateRsp = await oThis
      .update({ status: statusInt })
      .where({
        associated_aux_chain_id: associatedAuxChainId,
        kind: addressKindInt
      })
      .fire();

    if (updateRsp.affectedRows === 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_m_ca_10',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }
  }
}

module.exports = ChainAddress;
