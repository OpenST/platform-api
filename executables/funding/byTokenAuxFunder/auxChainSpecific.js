'use strict';
/**
 * Cron to fund stPrime by tokenAuxFunder.
 *
 * @module executables/funding/byTokenAuxFunder/auxChainSpecific
 *
 * This cron expects originChainId and auxChainIds as parameter in the params.
 */
const program = require('commander');

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  CronBase = require(rootPrefix + '/executables/CronBase'),
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  TransferStPrime = require(rootPrefix + '/lib/transfer/StPrime'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  GetStPrimeBalance = require(rootPrefix + '/lib/getBalance/StPrime'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  ClientConfigGroup = require(rootPrefix + '/app/models/mysql/ClientConfigGroup'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/funding/byTokenAuxFunder/auxChainSpecific.js --cronProcessId 1');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

// Declare variables.
const flowsForMinimumBalance = basicHelper.convertToBigNumber(coreConstants.FLOWS_FOR_MINIMUM_BALANCE),
  flowsForTransferBalance = basicHelper.convertToBigNumber(coreConstants.FLOWS_FOR_TRANSFER_BALANCE);

// TODO: Add executeTxWorkersKind.
// Config for addresses which need to be funded.
const fundingConfig = {
  [tokenAddressConstants.auxAdminAddressKind]: '0.00024',
  [tokenAddressConstants.auxWorkerAddressKind]: '0.00000'
};

/**
 * Class to fund eth by chain owner.
 *
 * @class
 */
class FundByChainOwnerAuxChainSpecific extends CronBase {
  /**
   * Constructor to fund stPrime and eth by chain owner.
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.canExit = true;
  }

  /**
   * Cron kind
   *
   * @return {String}
   *
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.fundByTokenAuxFunderAuxChainSpecific;
  }

  /**
   * Validate and sanitize
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    if (!oThis.originChainId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_f_bco_spe_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { originChainId: oThis.originChainId }
        })
      );
    }
  }

  /**
   * Pending tasks done
   *
   * @return {Boolean}
   *
   * @private
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }

  /**
   * Start the cron.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _start() {
    const oThis = this;

    logger.step('Fetching all chainIds.');
    await oThis._fetchChainIds();

    logger.step('Transferring StPrime to auxChainId addresses.');
    await oThis._transferStPrimeToAll();

    logger.step('Cron completed.');
  }

  /**
   * Fetch all chainIds.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchChainIds() {
    const oThis = this;

    if (!oThis.auxChainIds || oThis.auxChainIds.length === 0) {
      oThis.chainIds = await chainConfigProvider.allChainIds();
      oThis.auxChainIds = oThis.chainIds.filter((chainId) => chainId !== oThis.originChainId);
    }
  }

  /**
   * Transfer StPrime on all auxChainIds.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _transferStPrimeToAll() {
    const oThis = this;

    oThis.facilitatorAddresses = [];

    // Loop over all auxChainIds.
    for (let index = 0; index < oThis.auxChainIds.length; index++) {
      await oThis._transferStPrimeOnChain(oThis.auxChainIds[index]);
    }
  }

  /**
   * Transfer StPrime to addresses on specific auxChainId.
   *
   * @param {Number} auxChainId
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _transferStPrimeOnChain(auxChainId) {
    const oThis = this;

    logger.step('Fetching addresses on auxChainId: ' + auxChainId);

    // Fetch chainAddresses.
    const chainAddresses = await oThis._fetchAddressesForChain(auxChainId);

    if (chainAddresses.length === 0) {
      return;
    }

    logger.step('Fetching balances of addresses from auxChainId: ' + auxChainId);

    // Fetch StPrime balance for addresses.
    const getStPrimeBalance = new GetStPrimeBalance({
      auxChainId: auxChainId,
      addresses: chainAddresses
    });

    const addressBalances = await getStPrimeBalance.perform();

    // Check if addresses are eligible for refund.
    await oThis._checkIfEligibleForTransfer(addressBalances);

    logger.step('Transferring StPrime to addresses on auxChainId: ' + auxChainId);

    // Start transfer.
    oThis.canExit = false;

    if (oThis.transferDetails.length > 0) {
      const transferStPrime = new TransferStPrime({
        auxChainId: auxChainId,
        transferDetails: oThis.transferDetails
      });

      await transferStPrime.perform();
    }
    oThis.canExit = true;
  }

  /**
   * Fetch all the required addresses for the specific chainId.
   *
   * @param {Number} auxChainId
   *
   * @return {Promise<Array>}
   *
   * @private
   */
  async _fetchAddressesForChain(auxChainId) {
    const oThis = this,
      chainAddresses = [];

    // Step 1: Fetch all clientIds associated to auxChainIds.
    let chainClientIds = await new ClientConfigGroup()
      .select('client_id')
      .where(['chain_id = (?)', auxChainId])
      .fire();

    let clientIds = [];
    for (let index = 0; index < chainClientIds.length; index++) {
      let clientId = chainClientIds[index].client_id;

      clientIds.push(clientId);
    }

    if (clientIds.length === 0) {
      return chainAddresses;
    }

    // Step 2: Fetch all tokenIds associated to clientIds.
    let clientTokenIds = await new TokenModel()
      .select('id')
      .where(['client_id IN (?)', clientIds])
      .fire();

    let tokenIds = [];
    for (let index = 0; index < clientTokenIds.length; index++) {
      let tokenId = clientTokenIds[index].id;

      tokenIds.push(tokenId);
    }

    if (tokenIds.length === 0) {
      return chainAddresses;
    }

    // Step 3: Fetch token addresses associated to tokenIds.
    let tokenIdAddresses = await new TokenAddressModel()
      .select('*')
      .where([
        'token_id IN (?) AND kind IN (?)',
        tokenIds,
        [
          new TokenAddressModel().invertedKinds[tokenAddressConstants.auxFunderAddressKind],
          new TokenAddressModel().invertedKinds[tokenAddressConstants.auxWorkerAddressKind],
          new TokenAddressModel().invertedKinds[tokenAddressConstants.auxAdminAddressKind]
        ]
      ])
      .fire();

    oThis.tokenIds = [];
    oThis.tokenAddresses = {};
    oThis.kindToAddressMap = {};
    for (let index = 0; index < tokenIdAddresses.length; index++) {
      let tokenIdAddress = tokenIdAddresses[index],
        tokenId = tokenIdAddress.token_id,
        addressKind = new TokenAddressModel().kinds[tokenIdAddress.kind],
        address = tokenIdAddress.address;

      oThis.tokenIds.push(tokenId);
      oThis.kindToAddressMap[addressKind] = oThis.kindToAddressMap[addressKind] || [];
      oThis.kindToAddressMap[addressKind].push(address);
      oThis.tokenAddresses[tokenId] = oThis.tokenAddresses[tokenId] || {};
      oThis.tokenAddresses[tokenId][addressKind] = address;
      chainAddresses.push(address);
    }

    oThis.tokenIds = [...new Set(oThis.tokenIds)];

    return chainAddresses;
  }

  /**
   * Check which addresses are eligible to get funds and prepare params for transfer.
   *
   * @param {Object} currentAddressBalances
   *
   * @private
   */
  _checkIfEligibleForTransfer(currentAddressBalances) {
    const oThis = this;

    oThis.transferDetails = [];

    // Loop over tokenIds.
    for (let index = 0; index < oThis.tokenIds.length; index++) {
      // Fetch addresses.
      let tokenId = oThis.tokenIds[index],
        tokenAddresses = oThis.tokenAddresses[tokenId],
        tokenAuxFunderAddress = tokenAddresses[tokenAddressConstants.auxFunderAddressKind],
        tokenAuxAdminAddress = tokenAddresses[tokenAddressConstants.auxAdminAddressKind],
        tokenAuxWorkerAddress = tokenAddresses[tokenAddressConstants.auxWorkerAddressKind];

      // Determine minimum balances of addresses.
      let tokenAuxAdminMinimumBalance = basicHelper.convertToBigNumber(
          fundingConfig[tokenAddressConstants.auxAdminAddressKind]
        ),
        tokenAuxWorkerMinimumBalance = basicHelper.convertToBigNumber(
          fundingConfig[tokenAddressConstants.auxWorkerAddressKind]
        );

      // Determine current balances of addresses.
      let tokenAuxAdminCurrentBalance = basicHelper.convertToBigNumber(currentAddressBalances[tokenAuxAdminAddress]),
        tokenAuxWorkerCurrentBalance = basicHelper.convertToBigNumber(currentAddressBalances[tokenAuxWorkerAddress]);

      // Check for refund eligibility.
      if (tokenAuxAdminCurrentBalance.lt(tokenAuxAdminMinimumBalance.mul(flowsForMinimumBalance))) {
        let params = {
          from: tokenAuxFunderAddress,
          to: tokenAuxAdminAddress,
          amountInWei: basicHelper.convertToWei(tokenAuxAdminMinimumBalance.mul(flowsForTransferBalance)).toString(10)
        };
        oThis.transferDetails.push(params);
      }

      if (tokenAuxWorkerCurrentBalance.lt(tokenAuxWorkerMinimumBalance.mul(flowsForMinimumBalance))) {
        let params = {
          from: tokenAuxFunderAddress,
          to: tokenAuxWorkerCurrentBalance,
          amountInWei: basicHelper.convertToWei(tokenAuxWorkerMinimumBalance.mul(flowsForTransferBalance)).toString(10)
        };
        oThis.transferDetails.push(params);
      }
    }
  }
}

logger.log('Starting cron to fund eth by chainOwner.');

new FundByChainOwnerAuxChainSpecific({ cronProcessId: +program.cronProcessId })
  .perform()
  .then(function() {
    process.exit(0);
  })
  .catch(function() {
    process.exit(1);
  });
