'use strict';

/**
 * This script dissociate client from given token.
 * The script has following responsibilities:
 * 1] dissociate client from tokens table
 * 2] sets unique_hash in workflows table as NULL
 * 3] transfers ST Prime from token address to master internal funder.
 *
 * Usage: node executables/dissociateTokenFromClient.js  --auxChainId [auxChainId] --tokenId [tokenId]
 *
 *
 * @module executables/dissociateTokenFromClient
 */

const BigNumber = require('bignumber.js'),
  program = require('commander');

const rootPrefix = '..',
  fundingAmounts = require(rootPrefix + '/config/funding'),
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  WorkflowModel = require(rootPrefix + '/app/models/mysql/Workflow'),
  GetStPrimeBalance = require(rootPrefix + '/lib/getBalance/StPrime'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  TransferStPrimeBatch = require(rootPrefix + '/lib/fund/stPrime/BatchTransfer'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

// change disassociationReason accordingly before running this executable.
const txFees = new BigNumber('10').pow(9).mul(21000),
  zeroBn = new BigNumber(0),
  disassociationReason =
    '{"disassociation_reason":"Token holder in openst.js v0.10.0-beta.1 had wrong callprefix for executeTransaction and executeRedemption."}';

program
  .option('--auxChainId <auxChainId>', 'aux chain id')
  .option('--tokenId <tokenId>', 'token id')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/dissociateTokenFromClient.js --auxChainId 2000 --tokenId 1001');
  logger.log('');
  logger.log('');
});

if (!program.auxChainId || !program.tokenId) {
  program.help();
  process.exit(1);
}

class DissociateTokenFromClient {
  /**
   * Constructor
   *
   * @param {Object} params - external passed parameters
   * @param {Number/String} params.auxChainId - auxChainId
   * @param {Number/String} params.tokenId - tokenId
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.tokenId = params.tokenId;

    oThis.clientId = null;
    oThis.tokenAddresses = [];
    oThis.auxFunder = null;
    oThis.masterInternalFunder = null;
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
          internal_error_identifier: 'e_dtfc_1',
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

    await oThis._setAddresses();

    await oThis._updateTokensTable();

    await oThis._updateWorkflowsTable();

    await oThis._transferSTPrimeToAuxFunder();

    await oThis._transferSTPrimeToMasterInternalFunder();

    return Promise.resolve(responseHelper.successWithData('Done with success.'));
  }

  /**
   * Set Addresses.
   * Fetch aux funder and master internal funder address.
   *
   * @returns {Promise<never>}
   * @private
   */
  async _setAddresses() {
    const oThis = this;

    let tokenAddressCacheResponse = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    if (tokenAddressCacheResponse.isFailure()) {
      logger.error('Could not fetched token address details.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_dtfc_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            tokenId: oThis.tokenId
          }
        })
      );
    }

    let tokenAddressesMap = tokenAddressCacheResponse.data;

    oThis.auxFunder = tokenAddressesMap[tokenAddressConstants.auxFunderAddressKind];

    logger.debug('auxFunder------------', oThis.auxFunder);

    // This array contains address kinds with ST Prime balances.
    let tokenAddressKinds = Object.keys(fundingAmounts[tokenAddressConstants.auxFunderAddressKind].auxGas);

    for (let i = 0; i < tokenAddressKinds.length; i++) {
      // push addresses with ST Prime to tokenAddresses array
      let addressKindToCheck = tokenAddressKinds[i];

      if (!CommonValidators.validateArray(tokenAddressesMap[addressKindToCheck])) {
        // it is not an array, its an unique address
        oThis.tokenAddresses.push(tokenAddressesMap[addressKindToCheck]);
      } else {
        // its an array, so we have to push array elements into tokenAddresses array.
        let array = tokenAddressesMap[addressKindToCheck];
        oThis.tokenAddresses.push(...array);
      }
    }

    logger.debug('tokenAddresses------------', oThis.tokenAddresses);

    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_dtfc_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            tokenId: oThis.tokenId
          }
        })
      );
    }

    oThis.masterInternalFunder = chainAddressesRsp.data[chainAddressConstants.masterInternalFunderKind].address;
  }

  /**
   * Update client id in tokens table.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _updateTokensTable() {
    const oThis = this;

    let queryRsp = await new TokenModel().getDetailsByTokenId(oThis.tokenId);

    oThis.clientId = queryRsp.data.clientId;

    logger.debug('clientId------------', oThis.clientId);

    await new TokenModel()
      .update({
        client_id: null,
        client_id_was: oThis.clientId,
        debug: disassociationReason
      })
      .where({
        id: oThis.tokenId
      })
      .fire();

    // Clear token cache.
    await TokenModel.flushCache({ clientId: oThis.clientId, tokenId: oThis.tokenId });

    logger.info('*** De-association done: Tokens table ');
  }

  /**
   * Update unique hash in workflows table.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _updateWorkflowsTable() {
    const oThis = this;

    await new WorkflowModel()
      .update({
        unique_hash: null
      })
      .where({
        client_id: oThis.clientId,
        kind: new WorkflowModel().invertedKinds[workflowConstants.tokenDeployKind]
      })
      .fire();

    let queryRsp = await new WorkflowModel()
      .select('id')
      .where({
        client_id: oThis.clientId,
        kind: new WorkflowModel().invertedKinds[workflowConstants.tokenDeployKind]
      })
      .fire();

    for (let i = 0; i < queryRsp.length; i++) {
      // Clear workflow cache.
      await WorkflowModel.flushCache({ clientId: oThis.clientId, workflowId: queryRsp[i].id });
    }

    logger.info('*** De-association done: Workflows table ');
  }

  /**
   * Fetch ST Prime Balances for token addresses and transfer ST Prime to token aux funder.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _transferSTPrimeToAuxFunder() {
    const oThis = this;
    logger.info('*** Transfer ST Prime: token addresses to token aux funder');

    const getStPrimeBalanceObj = new GetStPrimeBalance({
      auxChainId: oThis.auxChainId,
      addresses: oThis.tokenAddresses
    });

    oThis.addressToBalanceMap = await getStPrimeBalanceObj.perform();

    logger.debug('addressToBalanceMap------------', oThis.addressToBalanceMap);

    let transferDetails = [];
    for (let tokenAddress in oThis.addressToBalanceMap) {
      let currentBalance = oThis.addressToBalanceMap[tokenAddress];
      let transferAmount = new BigNumber(currentBalance).minus(txFees);
      if (transferAmount.gt(zeroBn)) {
        transferDetails.push({
          fromAddress: tokenAddress,
          toAddress: oThis.auxFunder,
          amountInWei: transferAmount.toString(10)
        });
      }
    }

    logger.debug('transferDetails--------------', transferDetails);

    if (transferDetails.length === 0) {
      logger.warn(`No address found with non-zero ST Prime Balance for token id: ${oThis.tokenId}.`);
      return responseHelper.successWithData({});
    }

    const transferStPrime = new TransferStPrimeBatch({
      auxChainId: oThis.auxChainId,
      transferDetails: transferDetails
    });

    return transferStPrime.perform();
  }

  /**
   * Transfer STPrime from Aux Funder to Master Internal Funder
   *
   * @returns {Promise<*>}
   * @private
   */
  async _transferSTPrimeToMasterInternalFunder() {
    const oThis = this;
    logger.info('*** Transfer ST Prime: token aux funder to master internal funder');

    const getStPrimeBalanceObj = new GetStPrimeBalance({
      auxChainId: oThis.auxChainId,
      addresses: [oThis.auxFunder]
    });

    let getStPrimeBalanceRsp = await getStPrimeBalanceObj.perform(),
      auxFunderOstBalance = getStPrimeBalanceRsp[oThis.auxFunder];

    logger.debug('auxFunderOstBalance--------', auxFunderOstBalance);

    if (new BigNumber(auxFunderOstBalance).lte(zeroBn)) {
      logger.warn(`Token Aux Funder for token id: ${oThis.tokenId} has zero ST Prime Balance.`);
      return responseHelper.successWithData({});
    }

    let transferAmount = new BigNumber(auxFunderOstBalance).minus(txFees);

    logger.debug('transferAmount--------------', transferAmount);

    const transferStPrime = new TransferStPrimeBatch({
      auxChainId: oThis.auxChainId,
      transferDetails: [
        {
          fromAddress: oThis.auxFunder,
          toAddress: oThis.masterInternalFunder,
          amountInWei: transferAmount.toString(10)
        }
      ]
    });
    return transferStPrime.perform();
  }
}

new DissociateTokenFromClient({ tokenId: program.tokenId, auxChainId: program.auxChainId })
  .perform()
  .then(function(r) {
    logger.log(r);
    process.exit(0);
  })
  .catch(function(e) {
    logger.log(e);
    process.exit(1);
  });
