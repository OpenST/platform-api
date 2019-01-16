'use strict';

/*
 *
 *  @module lib/stakeMintManagement/ProofGenerator
 */

const rlp = require('rlp');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

class ProofGenerator {
  constructor(params) {
    const oThis = this;

    oThis.web3Instance = params.web3Instance;
    oThis.contractAddress = params.contractAddress;
    oThis.blockNumber = params.blockNumber;
    oThis.proofInputKeys = params.proofInputKeys;

    console.log('====oThis.proofInputKeys', oThis.proofInputKeys);
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

    let storageKeys = [],
      blockNumber = await oThis.web3Instance.utils.toHex(oThis.blockNumber),
      mappings = oThis.proofInputKeys[oThis.contractAddress];

    if (mappings.length > 0) {
      let storageIndex = '7'; //for gateway contract, it is 7.
      storageKeys.push(oThis._storagePath(storageIndex, mappings));
    }

    let resp = await oThis._getProof(oThis.contractAddress, storageKeys, blockNumber);

    if (resp.isSuccess()) {
      return Promise.resolve(responseHelper.successWithData(resp.data));
    } else {
      return Promise.resolve(responseHelper.successWithData(resp.toJSON()));
    }
  }

  /**
   * @param address - Address for which proof needs to be generated.
   * @param storageKeys - Array of keys for a mapping
   * @param blockNumber - Block number.
   *
   * @return {Promise<any>}
   * @private
   */
  async _getProof(address, storageKeys, blockNumber) {
    const oThis = this;

    let rpcParams = {
      jsonrpc: '2.0',
      method: 'eth_getProof',
      params: [address, storageKeys, blockNumber],
      id: new Date().getTime()
    };

    let response = await new Promise(function(resolve, reject) {
      oThis.web3Instance.currentProvider.send(rpcParams, (err, response) => {
        console.log('====response', JSON.stringify(response));

        if (response) {
          let accountProof = response.result.accountProof;
          let storageProofs = response.result.storageProof;
          let serializedAccountProof = oThis._serializeProof(accountProof);
          response.result.serializedAccountProof = serializedAccountProof;
          response.result.rlpAccount = oThis._generateRLPAccount(serializedAccountProof);
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

  /**
   *
   * @param storageIndex
   * @param mappings
   * @return {*|string}
   * @private
   */
  _storagePath(storageIndex, mappings) {
    const oThis = this;
    let path = '';

    if (mappings && mappings.length > 0) {
      mappings.map((mapping) => {
        path = `${path}${oThis.web3Instance.utils.padLeft(mapping, 64)}`;
      });
    }

    path = `${path}${oThis.web3Instance.utils.padLeft(storageIndex, 64)}`;
    path = web3.utils.sha3(path, { encoding: 'hex' });

    return path;
  }

  /**
   *
   *
   * @param serializedAccountProof
   * @return {string}
   * @private
   */
  _generateRLPAccount(serializedAccountProof) {
    let decodedProof = rlp.decode(serializedAccountProof);
    let leafElement = decodedProof[decodedProof.length - 1];
    return '0x' + leafElement[leafElement.length - 1].toString('hex');
  }
}

module.exports = ProofGenerator;
