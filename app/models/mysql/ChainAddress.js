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
   * @param {String} params.chainKind - chain kind
   * @param {String} params.kind - address kind
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

    if (chainAddressConst.uniqueKinds.indexOf(addressKind) > -1) {
      let existingRows = await oThis
        .select('*')
        .where([
          'chain_id = ? AND kind = ? AND chain_kind = ?',
          params.chainId,
          chainAddressConst.invertedKinds[params.kind],
          chainAddressConst.invertedChainKinds[params.chainKind]
        ])
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
        kind: addressKindInt,
        chain_kind: chainAddressConst.invertedChainKinds[params.chainKind],
        address: params.address
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

    let existingRows = await oThis
      .select('*')
      .where([
        'chain_id = ? AND kind = ? AND chain_kind = ?',
        params.chainId,
        chainAddressConst.invertedKinds[params.kind],
        chainAddressConst.invertedChainKinds[params.chainKind]
      ])
      .fire();

    let returnData;

    switch (existingRows.length) {
      case 1:
        returnData = { address: existingRows[0].address };
        break;
      default:
        let addresses = [];
        for (let i = 0; i < existingRows.length; i++) {
          addresses.push(existingRows[i].address);
        }
        returnData = { addresses: addresses };
    }

    return responseHelper.successWithData(returnData);
  }
}

module.exports = ChainAddress;
