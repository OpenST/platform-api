'use strict';

/*
 *
 *  @module lib/stakeMintManagement/proofGenerator
 */

const rlp = require('rlp');

const Web3 = require('web3'),
  web3 = new Web3('ws://127.0.0.1:8546');

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

class ProofGenerator {
  constructor(params) {
    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.auxChainId = params.auxChainId;
    oThis.blockNumber = params.blockNumber;
    oThis.mapping = params.mapping;
  }

  /**
   * perform
   *
   * @return {Promise|*|Promise<T>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_smm_pg_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * _asyncPerform
   *
   * @return {Promise<void>}
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    let storageKeys = null,
      blockNumber = null,
      contractAddress = oThis.contractAddress;

    // If contract addresses are not found
    if (!oThis.contractAddress) {
      return Promise.resolve(
        responseHelper.error({
          internal_error_identifier: 'l_smm_pg_2',
          api_error_identifier: 'contract_not_found',
          debug_options: {}
        })
      );
    }

    if (!oThis.blockNumber || oThis.blockNumber === undefined) {
      blockNumber = 'latest';
    } else {
      blockNumber = await web3.utils.toHex(oThis.blockNumber);
    }

    if (!oThis.mapping || oThis.mapping === undefined) {
      storageKeys = [];
    } else {
      let storageIndex = 7, //for gateway contract, it is 7.
        storageKeys = oThis.storagePath(storageIndex, oThis.mapping);
    }

    let resp = await oThis.getProof(contractAddress, storageKeys, blockNumber);

    if (resp.isSuccess()) {
      return Promise.resolve(responseHelper.successWithData(resp.data));
    } else {
      return Promise.resolve(responseHelper.successWithData(resp.toJSON()));
    }
  }

  /**
   * @param address -  Address for which proof needs to be generated.
   * @param blockNumber - Block number.
   * @param storageKeys - Array of keys for a mapping
   * @return {Promise<response.result>}
   */
  async getProof(address, storageKeys, blockNumber) {
    const oThis = this;

    let rpcParams = {
      jsonrpc: '2.0',
      method: 'eth_getProof',
      params: [address, storageKeys, blockNumber],
      id: new Date().getTime()
    };

    let response = await new Promise(function(resolve, reject) {
      web3.currentProvider.send(rpcParams, (err, response) => {
        if (response) {
          let accountProof = response.result.accountProof;
          let storageProofs = response.result.storageProof;
          response.result.serializedAccountProof = oThis._serializeProof(accountProof);
          storageProofs.forEach((sp) => {
            sp.serializedProof = oThis._serializeProof(sp.proof);
          });
          resolve(response);
        }
        reject(err);
      });
    });

    return Promise.resolve(responseHelper.successWithData(response.result));
  }

  /**
   *
   * @param proof Array of nodes representing merkel proof.
   * @return {string | *} Serialized proof.
   * @private
   */
  _serializeProof(proof) {
    let serializedProof = [];
    proof.forEach((p) => serializedProof.push(rlp.decode(p)));
    return `0x${rlp.encode(serializedProof).toString('hex')}`;
  }

  storagePath(storageIndex, mappings) {
    let path = '';

    if (mappings && mappings.length > 0) {
      mappings.map((mapping) => {
        path = `${path}${web3.utils.padLeft(mapping, 64)}`;
      });
    }

    path = `${path}${web3.utils.padLeft(storageIndex, 64)}`;
    path = web3.utils.sha3(path, { encoding: 'hex' });

    console.log('path------', path);

    return path;
  }
}

module.exports = ProofGenerator;
new ProofGenerator({ originChainId: 1000, auxChainId: 2000, blockNumber: 1000, mapping: '' })
  .perform()
  .then(console.log)
  .catch(console.log);

// gateway address specific
// web3Instance from outside or create using web3
//
