'use strict';
/**
 * Cron to fund stPrime by tokenAuxFunder.
 * by: tokenAuxFunder
 * to: [auxAdminAddressKind, auxWorkerAddressKind, tokenUserOpsWorkerKind]
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
  fundingAmounts = require(rootPrefix + '/executables/funding/fundingAmounts'),
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
  flowsForTransferBalance = basicHelper.convertToBigNumber(coreConstants.FLOWS_FOR_TRANSFER_BALANCE),
  fundingAmountsAuxGasMap = fundingAmounts[tokenAddressConstants.auxFunderAddressKind].auxGas;

const fundingConfig = {
  [tokenAddressConstants.auxAdminAddressKind]: {
    oneGWeiMinOSTPrimeAmount: fundingAmountsAuxGasMap[tokenAddressConstants.auxAdminAddressKind].fundAmount,
    thresholdAmount: fundingAmountsAuxGasMap[tokenAddressConstants.auxAdminAddressKind].thresholdAmount
  },
  [tokenAddressConstants.auxWorkerAddressKind]: {
    oneGWeiMinOSTPrimeAmount: fundingAmountsAuxGasMap[tokenAddressConstants.auxWorkerAddressKind].fundAmount,
    thresholdAmount: fundingAmountsAuxGasMap[tokenAddressConstants.auxWorkerAddressKind].thresholdAmount
  },
  [tokenAddressConstants.tokenUserOpsWorkerKind]: {
    oneGWeiMinOSTPrimeAmount: fundingAmountsAuxGasMap[tokenAddressConstants.tokenUserOpsWorkerKind].fundAmount,
    thresholdAmount: fundingAmountsAuxGasMap[tokenAddressConstants.tokenUserOpsWorkerKind].thresholdAmount
  }
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
          new TokenAddressModel().invertedKinds[tokenAddressConstants.auxAdminAddressKind],
          new TokenAddressModel().invertedKinds[tokenAddressConstants.tokenUserOpsWorkerKind]
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

    let auxMaxGasPriceMultiplierWithBuffer = basicHelper.getAuxMaxGasPriceMultiplierWithBuffer();

    // Loop over tokenIds.
    for (let index = 0; index < oThis.tokenIds.length; index++) {
      let totalStPrimeToTransfer = basicHelper.convertToBigNumber(0);
      // Fetch addresses.
      let tokenId = oThis.tokenIds[index],
        tokenAddresses = oThis.tokenAddresses[tokenId],
        tokenAuxFunderAddress = tokenAddresses[tokenAddressConstants.auxFunderAddressKind],
        tokenAuxAdminAddress = tokenAddresses[tokenAddressConstants.auxAdminAddressKind],
        tokenAuxWorkerAddress = tokenAddresses[tokenAddressConstants.auxWorkerAddressKind],
        tokenUserOpsWorkerAddress = tokenAddresses[tokenAddressConstants.tokenUserOpsWorkerKind];

      // Determine minimum balances of addresses.
      let tokenAuxAdminMaxFundBalance = basicHelper
          .convertToWei(String(fundingConfig[tokenAddressConstants.auxAdminAddressKind].oneGWeiMinOSTPrimeAmount))
          .mul(basicHelper.convertToBigNumber(auxMaxGasPriceMultiplierWithBuffer)),
        tokenAuxWorkerMaxFundBalance = basicHelper
          .convertToWei(String(fundingConfig[tokenAddressConstants.auxWorkerAddressKind].oneGWeiMinOSTPrimeAmount))
          .mul(basicHelper.convertToBigNumber(auxMaxGasPriceMultiplierWithBuffer)),
        tokenUserOpsWorkerMaxFundBalance = basicHelper
          .convertToWei(String(fundingConfig[tokenAddressConstants.tokenUserOpsWorkerKind].oneGWeiMinOSTPrimeAmount))
          .mul(basicHelper.convertToBigNumber(auxMaxGasPriceMultiplierWithBuffer)),
        tokenAuxAdminThresholdFund = basicHelper
          .convertToWei(String(fundingConfig[tokenAddressConstants.auxAdminAddressKind].thresholdAmount))
          .mul(basicHelper.convertToBigNumber(auxMaxGasPriceMultiplierWithBuffer)),
        tokenAuxWorkerThresholdFund = basicHelper
          .convertToWei(String(fundingConfig[tokenAddressConstants.auxWorkerAddressKind].thresholdAmount))
          .mul(basicHelper.convertToBigNumber(auxMaxGasPriceMultiplierWithBuffer)),
        tokenUserOpsWorkerThresholdFund = basicHelper
          .convertToWei(String(fundingConfig[tokenAddressConstants.tokenUserOpsWorkerKind].thresholdAmount))
          .mul(basicHelper.convertToBigNumber(auxMaxGasPriceMultiplierWithBuffer));

      // Determine current balances of addresses.
      let tokenAuxAdminCurrentBalance = basicHelper.convertToBigNumber(currentAddressBalances[tokenAuxAdminAddress]),
        tokenAuxWorkerCurrentBalance = basicHelper.convertToBigNumber(currentAddressBalances[tokenAuxWorkerAddress]),
        tokenUserOpsWorkerCurrentBalance = basicHelper.convertToBigNumber(
          currentAddressBalances[tokenUserOpsWorkerAddress]
        ),
        tokenAuxFunderCurrentBalance = basicHelper.convertToBigNumber(currentAddressBalances[tokenAuxFunderAddress]);

      // Check for refund eligibility.
      if (tokenAuxAdminCurrentBalance.lt(tokenAuxAdminThresholdFund)) {
        logger.info('\n\n1----->tokenAuxAdminCurrentBalance', tokenAuxAdminCurrentBalance.toString(10));
        logger.info('1------>tokenAuxAdminThresholdFund', tokenAuxAdminThresholdFund.toString(10));
        logger.info('1-------->tokenAuxAdminAddress', tokenAuxAdminAddress);
        logger.info('1-------->tokenAuxAdminMaxFundBalance', tokenAuxAdminMaxFundBalance);
        let amountToTransferToAuxAdminBN = tokenAuxAdminMaxFundBalance.minus(tokenAuxAdminCurrentBalance),
          params = {
            fromAddress: tokenAuxFunderAddress,
            toAddress: tokenAuxAdminAddress,
            amountInWei: amountToTransferToAuxAdminBN.toString(10)
          };
        totalStPrimeToTransfer = totalStPrimeToTransfer.plus(amountToTransferToAuxAdminBN);
        if (tokenAuxFunderCurrentBalance.gt(totalStPrimeToTransfer)) {
          oThis.transferDetails.push(params);
        } else {
          continue;
        }
      }

      if (tokenAuxWorkerCurrentBalance.lt(tokenAuxWorkerThresholdFund)) {
        logger.info('\n\n2----->tokenAuxWorkerCurrentBalance', tokenAuxWorkerCurrentBalance.toString(10));
        logger.info('2------>tokenAuxWorkerThresholdFund', tokenAuxWorkerThresholdFund.toString(10));
        logger.info('2-------->tokenAuxWorkerAddress', tokenAuxWorkerAddress);
        logger.info('2-------->tokenAuxWorkerMaxFundBalance', tokenAuxWorkerMaxFundBalance);

        let amountToTransferToAuxWorkerBN = tokenAuxWorkerMaxFundBalance.minus(tokenAuxWorkerCurrentBalance),
          params = {
            fromAddress: tokenAuxFunderAddress,
            toAddress: tokenAuxWorkerAddress,
            amountInWei: amountToTransferToAuxWorkerBN.toString(10)
          };
        totalStPrimeToTransfer = totalStPrimeToTransfer.plus(amountToTransferToAuxWorkerBN);
        if (tokenAuxFunderCurrentBalance.gt(totalStPrimeToTransfer)) {
          oThis.transferDetails.push(params);
        } else {
          continue;
        }
      }

      if (tokenUserOpsWorkerCurrentBalance.lt(tokenUserOpsWorkerThresholdFund)) {
        logger.info('3----->tokenUserOpsWorkerCurrentBalance', tokenUserOpsWorkerCurrentBalance.toString(10));
        logger.info('3------>tokenUserOpsWorkerThresholdFund', tokenUserOpsWorkerThresholdFund.toString(10));
        logger.info('3-------->tokenUserOpsWorkerAddress', tokenUserOpsWorkerAddress);
        logger.info('3-------->tokenUserOpsWorkerMaxFundBalance', tokenUserOpsWorkerMaxFundBalance);

        let amountToTransferToUserOpsWorkerBN = tokenUserOpsWorkerMaxFundBalance.minus(
            tokenUserOpsWorkerCurrentBalance
          ),
          params = {
            fromAddress: tokenAuxFunderAddress,
            toAddress: tokenUserOpsWorkerAddress,
            amountInWei: amountToTransferToUserOpsWorkerBN.toString(10)
          };
        logger.info('3.2-------->amountToTransferToUserOpsWorkerBN', amountToTransferToUserOpsWorkerBN);
        totalStPrimeToTransfer = totalStPrimeToTransfer.plus(amountToTransferToUserOpsWorkerBN);
        if (tokenAuxFunderCurrentBalance.gt(totalStPrimeToTransfer)) {
          oThis.transferDetails.push(params);
        } else {
          continue;
        }
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
