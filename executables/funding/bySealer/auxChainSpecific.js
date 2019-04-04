/**
 * Cron to fund stPrime by sealer addresses.
 *
 * @module executables/funding/bySealer/auxChainSpecific
 */
const program = require('commander');

const rootPrefix = '../../..',
  CronBase = require(rootPrefix + '/executables/CronBase'),
  GetStPrimeBalance = require(rootPrefix + '/lib/getBalance/StPrime'),
  TransferStPrimeBatch = require(rootPrefix + '/lib/fund/stPrime/BatchTransfer'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/funding/bySealer/auxChainSpecific.js --cronProcessId 11');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class to give back funds from sealer.
 *
 * @class FundBySealerAuxChainSpecific
 */
class FundBySealerAuxChainSpecific extends CronBase {
  /**
   * Constructor to give back funds from sealer.
   *
   * @augments CronBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.kindToAddressMap = {};
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
    return cronProcessesConstants.fundBySealerAuxChainSpecific;
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
          internal_error_identifier: 'e_f_bs_acs_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { originChainId: oThis.originChainId }
        })
      );
    }

    if (!oThis.auxChainId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_f_bs_acs_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: { auxChainId: oThis.auxChainId }
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

    logger.step('fetch master internal funder address');
    await oThis._fetchMasterInternalFunderAddress();

    logger.step('Transferring StPrime to auxChainId addresses.');
    await oThis._transferStPrimeOnChain();

    logger.step('Cron completed.');
  }

  /**
   * Fetch master internal funder address.
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _fetchMasterInternalFunderAddress() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_f_bs_acs_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.masterInternalFunderAddress = chainAddressesRsp.data[chainAddressConstants.masterInternalFunderKind].address;
  }

  /**
   * Transfer StPrime to addresses on specific auxChainId.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _transferStPrimeOnChain() {
    const oThis = this;

    logger.step('Fetching addresses on auxChainId: ' + oThis.auxChainId);

    // Fetch chainAddresses.
    const chainAddresses = await oThis._fetchAddressesForChain();

    logger.step('Fetching balances of addresses from auxChainId: ' + oThis.auxChainId);

    // Fetch StPrime balance for addresses.
    const getStPrimeBalance = new GetStPrimeBalance({
      auxChainId: oThis.auxChainId,
      addresses: chainAddresses
    });

    const addressBalances = await getStPrimeBalance.perform();

    // Check if addresses are eligible for refund.
    await oThis._checkIfEligibleForTransfer(addressBalances);

    logger.step('Transferring StPrime to addresses on auxChainId: ' + oThis.auxChainId);

    // Start transfer.
    oThis.canExit = false;

    if (oThis.transferDetails.length > 0) {
      const transferStPrime = new TransferStPrimeBatch({
        auxChainId: oThis.auxChainId,
        transferDetails: oThis.transferDetails
      });

      await transferStPrime.perform();
    }
    oThis.canExit = true;
  }

  /**
   * Fetch all the required addresses for the specific chainId.
   *
   *
   * @return {Promise<Array>}
   *
   * @private
   */
  async _fetchAddressesForChain() {
    const oThis = this;

    // Fetch all addresses associated to auxChainId.
    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_f_bs_acs_4',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    const sealerAddresses = [],
      sealerAddressEntities = chainAddressesRsp.data[chainAddressConstants.auxSealerKind];

    if (!sealerAddressEntities || sealerAddressEntities.length === 0) {
      logger.error('No sealer present for aux chain id: ', oThis.auxChainId);

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_f_bs_acs_5',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    for (let index = 0; index < sealerAddressEntities.length; index++) {
      sealerAddresses.push(sealerAddressEntities[index].address);
    }

    oThis.kindToAddressMap[chainAddressConstants.auxSealerKind] = sealerAddresses;

    return sealerAddresses;
  }

  /**
   * Check which addresses are eligible to get funds and prepare params for transfer.
   *
   * @private
   */
  _checkIfEligibleForTransfer(currentAddressBalances) {
    const oThis = this;

    oThis.transferDetails = [];

    // Fetch addresses from map.
    const sealerAddresses = oThis.kindToAddressMap[chainAddressConstants.auxSealerKind];

    for (let index = 0; index < sealerAddresses.length; index++) {
      const sealerAddress = sealerAddresses[index];

      const sealerAddressBalance = currentAddressBalances[sealerAddress];

      logger.debug('sealerAddress-----', sealerAddress);
      logger.debug('sealerAddressBalance-----', sealerAddressBalance);

      if (basicHelper.convertToBigNumber(sealerAddressBalance).gt(basicHelper.convertToWei(1))) {
        oThis.transferDetails.push({
          fromAddress: sealerAddress,
          toAddress: oThis.masterInternalFunderAddress,
          amountInWei: basicHelper
            .convertToBigNumber(sealerAddressBalance)
            .minus(basicHelper.convertToWei(0.5))
            .toString(10)
        });
      }
    }
  }
}

logger.log('Starting cron to fund by sealer to chain owner.');

new FundBySealerAuxChainSpecific({ cronProcessId: +program.cronProcessId })
  .perform()
  .then(function() {
    process.emit('SIGINT');
  })
  .catch(function() {
    process.emit('SIGINT');
  });
