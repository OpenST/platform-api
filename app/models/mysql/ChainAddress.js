'use strict';

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base');

const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

class ChainAddress extends ModelBase {
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'chain_addresses';
  }

  /**
   * parameters
   *
   * @param {object} params - external passed parameters
   * @param {String} params.address - address
   * @param {String} params.chainId - chainId
   *
   * @return {Promise}
   */
  async insertSimpleTokenOwnerAddress(params) {
    const oThis = this;

    let existingRows = oThis
      .select('*')
      .where(['kind=?', chainAddressConst.invertedKinds[chainAddressConst.simpleTokenOwnerKind]])
      .fire();

    if (existingRows.length > 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_m_es_1',
          api_error_identifier: 'duplicate_entry',
          debug_options: {}
        })
      );
    }

    let insertedRec = await new ChainAddress()
      .insert({
        chain_id: params.chainId,
        kind: chainAddressConst.invertedKinds[chainAddressConst.simpleTokenOwnerKind],
        chain_kind: chainAddressConst.invertedChainKinds[chainAddressConst.originChainKind],
        address: oThis.ethAddress
      })
      .fire();

    if (insertedRec.affectedRows === 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_m_es_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({ chainAddressId: insertedRec.id });
  }

  /**
   * parameters
   *
   * @param {object} params - external passed parameters
   * @param {String} params.address - address
   * @param {String} params.chainId - address
   *
   * @return {Promise}
   */
  async insertSimpleTokenAdminAddress(params) {
    const oThis = this;

    let existingRows = oThis
      .select('*')
      .where(['kind=?', chainAddressConst.invertedKinds[chainAddressConst.simpleTokenAdminKind]])
      .fire();

    if (existingRows.length > 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_m_es_3',
          api_error_identifier: 'duplicate_entry',
          debug_options: {}
        })
      );
    }

    let insertedRec = await new ChainAddress()
      .insert({
        chain_id: params.chainId,
        kind: chainAddressConst.invertedKinds[chainAddressConst.simpleTokenAdminKind],
        chain_kind: chainAddressConst.invertedChainKinds[chainAddressConst.originChainKind],
        address: oThis.ethAddress
      })
      .fire();

    if (insertedRec.affectedRows === 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_m_es_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({ chainAddressId: insertedRec.id });
  }
}

module.exports = ChainAddress;
