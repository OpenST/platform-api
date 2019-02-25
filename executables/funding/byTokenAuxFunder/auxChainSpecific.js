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
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  GetStPrimeBalance = require(rootPrefix + '/lib/getBalance/StPrime'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  TransferStPrimeBatch = require(rootPrefix + '/lib/fund/stPrime/BatchTransfer'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  ByTokenAuxFunderBase = require(rootPrefix + '/executables/funding/byTokenAuxFunder/Base');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/funding/byTokenAuxFunder/auxChainSpecific.js --cronProcessId 14');
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

// Config for addresses which need to be funded.
const fundingConfig = {
  [tokenAddressConstants.auxAdminAddressKind]: '0.00005', //TODO-Funding
  [tokenAddressConstants.auxWorkerAddressKind]: '0.00005' //TODO-Funding
};

/**
 * Class to fund eth by chain owner.
 *
 * @class
 */
class FundByChainOwnerAuxChainSpecific extends ByTokenAuxFunderBase {
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
   * Transfer StPrime to addresses on specific auxChainId.
   *
   * @param {Number} auxChainId
   * @param {Array} tokenIds
   * @return {Promise<void>}
   *
   * @private
   */
  async _startTransfer(tokenIds, auxChainId) {
    const oThis = this;

    logger.step('Fetching addresses on auxChainId: ' + auxChainId);

    // Fetch chainAddresses.
    const chainAddresses = await oThis._fetchAddressesForChain(tokenIds, auxChainId);

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
      const transferStPrime = new TransferStPrimeBatch({
        auxChainId: auxChainId,
        transferDetails: oThis.transferDetails,
        handleSigint: 1
      });

      await transferStPrime.perform();
    }
    oThis.canExit = true;
  }

  /**
   * Fetch all the required addresses for the specific chainId.
   *
   * @param {Number} auxChainId
   * @param {Array} tokenIds
   *
   * @return {Promise<Array>}
   *
   * @private
   */
  async _fetchAddressesForChain(tokenIds, auxChainId) {
    const oThis = this,
      chainAddresses = [];

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

    // Convert an array to a set and then convert it back to an array, to remove duplicate elements.
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
          fromAddress: tokenAuxFunderAddress,
          toAddress: tokenAuxAdminAddress,
          amountInWei: basicHelper.convertToWei(tokenAuxAdminMinimumBalance.mul(flowsForTransferBalance)).toString(10)
        };
        oThis.transferDetails.push(params);
      }

      if (tokenAuxWorkerCurrentBalance.lt(tokenAuxWorkerMinimumBalance.mul(flowsForMinimumBalance))) {
        let params = {
          fromAddress: tokenAuxFunderAddress,
          toAddress: tokenAuxWorkerAddress,
          amountInWei: basicHelper.convertToWei(tokenAuxWorkerMinimumBalance.mul(flowsForTransferBalance)).toString(10)
        };
        oThis.transferDetails.push(params);
      }
    }
  }
}

logger.log('Starting cron to fund St Prime by tokenAuxFunder.');

new FundByChainOwnerAuxChainSpecific({ cronProcessId: +program.cronProcessId })
  .perform()
  .then(function() {
    process.emit('SIGINT');
  })
  .catch(function() {
    process.emit('SIGINT');
  });
