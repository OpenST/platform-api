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
  GetStPrimeBalance = require(rootPrefix + '/lib/getBalance/StPrime'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  TransferStPrimeBatch = require(rootPrefix + '/lib/fund/stPrime/BatchTransfer'),
  ByTokenAuxFunderBase = require(rootPrefix + '/executables/funding/byTokenAuxFunder/Base'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  fundingAmounts = require(rootPrefix + '/config/funding'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

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
const fundingAmountsAuxGasMap = fundingAmounts[tokenAddressConstants.auxFunderAddressKind].auxGas;

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
  },
  [tokenAddressConstants.recoveryControllerAddressKind]: {
    oneGWeiMinOSTPrimeAmount: fundingAmountsAuxGasMap[tokenAddressConstants.recoveryControllerAddressKind].fundAmount,
    thresholdAmount: fundingAmountsAuxGasMap[tokenAddressConstants.recoveryControllerAddressKind].thresholdAmount
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
    oThis.tokenIds = [];
    oThis.transferDetails = [];
    oThis.tokenIdToKindToAddressesMap = {};
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
   * @param {Array} tokenIds
   * @return {Promise<void>}
   *
   * @private
   */
  async _startTransfer(tokenIds) {
    const oThis = this;

    logger.step('Fetching addresses on auxChainId: ' + oThis.auxChainId);

    // Fetch chainAddresses
    const chainAddresses = await oThis._fetchAddressesForChain(tokenIds);

    if (chainAddresses.length === 0) {
      return;
    }

    logger.step('Fetching balances of addresses from auxChainId: ' + oThis.auxChainId);

    // Fetch StPrime balance for addresses.
    const getStPrimeBalance = new GetStPrimeBalance({
      auxChainId: oThis.auxChainId,
      addresses: chainAddresses
    });

    const addressBalances = await getStPrimeBalance.perform();

    // Prepare transfer details.
    await oThis._prepareTransferDetails(addressBalances);

    logger.step('Transferring StPrime to addresses on auxChainId: ' + oThis.auxChainId);

    // Start transfer.
    oThis.canExit = false;

    if (oThis.transferDetails.length > 0) {
      const transferStPrime = new TransferStPrimeBatch({
        auxChainId: oThis.auxChainId,
        transferDetails: oThis.transferDetails,
        handleSigint: 1
      });

      await transferStPrime.perform();
    }
    oThis.canExit = true;
  }

  /**
   * Fetch all the required addresses.
   *
   * @param {Array} tokenIds
   *
   * @return {Promise<Array>}
   *
   * @private
   */
  async _fetchAddressesForChain(tokenIds) {
    const oThis = this,
      chainAddresses = [];

    if (tokenIds.length === 0) {
      return chainAddresses;
    }

    // Step 3: Fetch token addresses associated to tokenIds.
    const tokenIdAddresses = await new TokenAddressModel()
      .select('*')
      .where([
        'token_id IN (?) AND kind IN (?)',
        tokenIds,
        [
          new TokenAddressModel().invertedKinds[tokenAddressConstants.auxFunderAddressKind],
          new TokenAddressModel().invertedKinds[tokenAddressConstants.auxWorkerAddressKind],
          new TokenAddressModel().invertedKinds[tokenAddressConstants.auxAdminAddressKind],
          new TokenAddressModel().invertedKinds[tokenAddressConstants.tokenUserOpsWorkerKind],
          new TokenAddressModel().invertedKinds[tokenAddressConstants.recoveryControllerAddressKind]
        ]
      ])
      .fire();

    for (let index = 0; index < tokenIdAddresses.length; index++) {
      const tokenIdAddress = tokenIdAddresses[index],
        tokenId = tokenIdAddress.token_id,
        addressKind = new TokenAddressModel().kinds[tokenIdAddress.kind],
        address = tokenIdAddress.address;

      oThis.tokenIds.push(tokenId);
      oThis.tokenIdToKindToAddressesMap[tokenId] = oThis.tokenIdToKindToAddressesMap[tokenId] || {};
      oThis.tokenIdToKindToAddressesMap[tokenId][addressKind] =
        oThis.tokenIdToKindToAddressesMap[tokenId][addressKind] || [];
      oThis.tokenIdToKindToAddressesMap[tokenId][addressKind].push(address);
      chainAddresses.push(address);
    }

    // Convert an array to a set and then convert it back to an array, to remove duplicate elements.
    oThis.tokenIds = [...new Set(oThis.tokenIds)];

    return chainAddresses;
  }

  /**
   * Prepare transfer details.
   *
   * @param {Object} currentAddressBalances
   *
   * @private
   */
  async _prepareTransferDetails(currentAddressBalances) {
    const oThis = this;

    const tokenAddressKindsForFunding = [
      tokenAddressConstants.auxAdminAddressKind,
      tokenAddressConstants.auxWorkerAddressKind,
      tokenAddressConstants.recoveryControllerAddressKind,
      tokenAddressConstants.tokenUserOpsWorkerKind
    ];

    // Loop over tokenIds.
    for (let index = 0; index < oThis.tokenIds.length; index++) {
      oThis.totalStPrimeToTransfer = basicHelper.convertToBigNumber(0);

      const tokenId = oThis.tokenIds[index];

      for (let arrayIndex = 0; arrayIndex < tokenAddressKindsForFunding.length; arrayIndex++) {
        const evaluationResponse = await oThis._evaluateTransferDetails(
          tokenAddressKindsForFunding[arrayIndex],
          tokenId,
          currentAddressBalances
        );

        if (evaluationResponse.isFailure()) {
          // This means for given token Id token aux funder's balance is not enough. Thus moving on to next token id.
          break;
        }
      }
    }
  }

  /**
   * Evaluate transfer details.
   *
   * @param {String} addressKind
   * @param {String/Number} tokenId
   * @param {Object} currentAddressBalances
   *
   * @returns {*}
   *
   * @private
   */
  async _evaluateTransferDetails(addressKind, tokenId, currentAddressBalances) {
    const oThis = this;

    const tokenAddresses = oThis.tokenIdToKindToAddressesMap[tokenId],
      tokenAuxFunderAddress = tokenAddresses[tokenAddressConstants.auxFunderAddressKind][0],
      tokenAuxFunderCurrentBalance = basicHelper.convertToBigNumber(currentAddressBalances[tokenAuxFunderAddress]),
      addresses = tokenAddresses[addressKind],
      addressThresholdAmount = oThis._fetchThresholdAmountsInWei(addressKind),
      addressMaxFundAmount = oThis._fetchMaxFundingAmountsInWei(addressKind);

    if (!(addresses && addresses.length)) return responseHelper.successWithData({});

    for (let index = 0; index < addresses.length; index++) {
      const address = addresses[index],
        addressCurrentBalance = basicHelper.convertToBigNumber(currentAddressBalances[address]);

      logger.info('\n\nAddressKind:', addressKind);
      logger.info('Address:', address);
      logger.info('AddressCurrentBalance:', addressCurrentBalance.toString(10));
      logger.info('AddressThresholdAmount:', addressThresholdAmount.toString(10));
      logger.info('AddressMaxFundAmount:', addressMaxFundAmount.toString(10));

      if (addressCurrentBalance.lt(addressThresholdAmount)) {
        const amountToTransferBN = addressMaxFundAmount.minus(addressCurrentBalance),
          params = {
            fromAddress: tokenAuxFunderAddress,
            toAddress: address,
            amountInWei: amountToTransferBN.toString(10)
          };
        oThis.totalStPrimeToTransfer = oThis.totalStPrimeToTransfer.plus(amountToTransferBN);
        // Checking if token aux funder has the balance to fund the given address.
        if (tokenAuxFunderCurrentBalance.gt(oThis.totalStPrimeToTransfer)) {
          oThis.transferDetails.push(params);
        } else {
          oThis.totalStPrimeToTransfer = oThis.totalStPrimeToTransfer.minus(amountToTransferBN);

          logger.warn('addressKind tokenAuxFunder has low balance on chainId: ' + oThis.auxChainId);
          logger.warn('Address: ' + tokenAuxFunderAddress);
          logger.warn('TokenId: ' + tokenId);

          const errorObject = responseHelper.error({
            internal_error_identifier: 'low_balance:e_f_btaf_acs_1',
            api_error_identifier: 'low_balance',
            debug_options: { tokenId: tokenId, address: tokenAuxFunderAddress }
          });

          await createErrorLogsEntry.perform(errorObject, ErrorLogsConstants.highSeverity);

          return responseHelper.error({
            internal_error_identifier: 'e_f_btaf_acs_2',
            api_error_identifier: 'something_went_wrong',
            debug_options: {}
          });
        }
      }
    }

    return responseHelper.successWithData({});
  }

  /**
   * Fetches max transfer amount of given address kind from config.
   *
   * @param {String} addressKind
   *
   * @returns {BigNumber}
   *
   * @private
   */
  _fetchMaxFundingAmountsInWei(addressKind) {
    const auxGasPrice = basicHelper.getAuxMaxGasPriceMultiplierWithBuffer();

    return basicHelper
      .convertToLowerUnit(
        String(fundingConfig[addressKind].oneGWeiMinOSTPrimeAmount),
        coreConstants.ETH_CONVERSION_DECIMALS
      )
      .mul(basicHelper.convertToBigNumber(auxGasPrice));
  }

  /**
   * Fetches threshold amount of given address kind from config.
   *
   * @param {String} addressKind
   *
   * @returns {BigNumber}
   *
   * @private
   */
  _fetchThresholdAmountsInWei(addressKind) {
    const auxGasPrice = basicHelper.getAuxMaxGasPriceMultiplierWithBuffer();

    return basicHelper
      .convertToLowerUnit(String(fundingConfig[addressKind].thresholdAmount), coreConstants.ETH_CONVERSION_DECIMALS)
      .mul(basicHelper.convertToBigNumber(auxGasPrice));
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
