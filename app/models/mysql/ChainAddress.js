'use strict';

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base');

const dbName = 'saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment;

class ChainAddress extends ModelBase {
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'chain_addresses';
  }

  /**
   * insert address
   *
   * @param {object} params - external passed parameters
   * @param {String} params.address - address
   * @param {Integer} params.chainId - chainId
   * @param {Integer} params.auxChainId - auxChainId
   * @param {String} params.chainKind - chain kind
   * @param {String} params.kind - address kind
   * @param {Integer} params.status - status
   *
   * @return {Promise}
   */
  async insertAddress(params) {
    const oThis = this,
      addressKind = params['kind'],
      addressKindInt = chainAddressConst.invertedKinds[addressKind];

    if (!addressKindInt) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_m_es_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    let whereClause = null;

    if (params.auxChainId) {
      whereClause = [
        'chain_id = ? AND aux_chain_id = ? AND kind = ? AND chain_kind = ?',
        params.chainId,
        params.auxChainId,
        chainAddressConst.invertedKinds[params.kind],
        chainAddressConst.invertedChainKinds[params.chainKind]
      ];
    } else {
      whereClause = [
        'chain_id = ? AND kind = ? AND chain_kind = ?',
        params.chainId,
        chainAddressConst.invertedKinds[params.kind],
        chainAddressConst.invertedChainKinds[params.chainKind]
      ];
    }

    if (chainAddressConst.uniqueKinds.indexOf(addressKind) > -1) {
      let existingRows = await oThis
        .select('*')
        .where(whereClause)
        .fire();

      if (existingRows.length > 0) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'm_m_es_2',
            api_error_identifier: 'duplicate_entry',
            debug_options: {}
          })
        );
      }
    }

    let insertedRec = await new ChainAddress()
      .insert({
        chain_id: params.chainId,
        aux_chain_id: params.auxChainId,
        kind: addressKindInt,
        chain_kind: chainAddressConst.invertedChainKinds[params.chainKind],
        address: params.address,
        status: chainAddressConst.invertedStatuses[chainAddressConst.activeStatus]
      })
      .fire();

    if (insertedRec.affectedRows === 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_m_es_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    return responseHelper.successWithData({ chainAddressId: insertedRec.id });
  }

  /**
   * fetch address
   *
   * @param {object} params - external passed parameters
   * @param {Integer} params.chainId - chainId
   * @param {Integer} params.auxChainId - auxChainId
   * @param {String} params.chainKind - chain kind
   * @param {String} params.kind - address kind
   *
   * @return {Promise}
   */
  async fetchAddress(params) {
    const oThis = this,
      addressKind = params['kind'],
      addressKindInt = chainAddressConst.invertedKinds[addressKind];

    if (!addressKindInt) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'm_m_es_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: {}
        })
      );
    }

    let whereClause = null;

    if (params.auxChainId) {
      whereClause = [
        'chain_id = ? AND aux_chain_id = ? AND kind = ? AND status = ?',
        params.chainId,
        params.auxChainId,
        chainAddressConst.invertedKinds[params.kind],
        chainAddressConst.invertedStatuses[chainAddressConst.activeStatus]
      ];
    } else {
      whereClause = [
        'chain_id = ? AND kind = ? AND status = ?',
        params.chainId,
        chainAddressConst.invertedKinds[params.kind],
        chainAddressConst.invertedStatuses[chainAddressConst.activeStatus]
      ];
    }

    let existingRows = await oThis
      .select('*')
      .where(whereClause)
      .fire();

    let returnData;

    if (chainAddressConst.uniqueKinds.indexOf(addressKind) > -1) {
      returnData = { address: (existingRows[0] || {}).address };
    } else {
      let addresses = [];
      for (let i = 0; i < existingRows.length; i++) {
        addresses.push(existingRows[i].address);
      }
      returnData = { addresses: addresses };
    }

    return responseHelper.successWithData(returnData);
  }

  /**
   * fetch addresses
   *
   * @param {object} params - external passed parameters
   * @param {Integer} params.chainId - chainId
   * @param {Integer} params.auxChainId - auxChainId
   * @param {String} params.kinds - address kind
   *
   * @return {Promise}
   */
  async fetchAddresses(params) {
    const oThis = this,
      addressKinds = params['kinds'],
      addressKindIntToStrMap = {};

    for (let i = 0; i < addressKinds.length; i++) {
      let addressKindStr = addressKinds[i],
        addressKindInt = chainAddressConst.invertedKinds[addressKindStr];
      if (!addressKindInt) {
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'm_m_es_5',
            api_error_identifier: 'something_went_wrong',
            debug_options: { addressKind: addressKindStr }
          })
        );
      }
      addressKindIntToStrMap[addressKindInt] = addressKindStr;
    }

    let whereClause = null;

    if (params.auxChainId) {
      whereClause = [
        'chain_id = ? AND aux_chain_id = ? AND status = ?',
        params.chainId,
        params.auxChainId,
        chainAddressConst.invertedStatuses[chainAddressConst.activeStatus]
      ];
    } else {
      whereClause = [
        'chain_id = ? AND status = ?',
        params.chainId,
        chainAddressConst.invertedStatuses[chainAddressConst.activeStatus]
      ];
    }

    let returnData = {
      address: {},
      addresses: {}
    };

    let dbRows = await oThis
      .select('*')
      .where(whereClause)
      .where(['kind IN (?)', Object.keys(addressKindIntToStrMap)])
      .fire();

    for (let i = 0; i < dbRows.length; i++) {
      let dbRow = dbRows[i],
        addressKindStr = chainAddressConst.kinds[dbRow.kind.toString()];

      if (chainAddressConst.uniqueKinds.indexOf(addressKindStr) > -1) {
        returnData['address'][addressKindStr] = dbRow.address;
      } else {
        if (!returnData['addresses'][addressKindStr]) {
          returnData['addresses'][addressKindStr] = [];
        }
        returnData['addresses'][addressKindStr].push(dbRow.address);
      }
    }

    return responseHelper.successWithData(returnData);
  }
}

module.exports = ChainAddress;
