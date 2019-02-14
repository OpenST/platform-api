'use strict';
/**
 * Cron to fund stPrime by sealer addresses.
 *
 * @module executables/funding/bySealer/auxChainSpecific
 */
const program = require('commander');

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  CronBase = require(rootPrefix + '/executables/CronBase'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  GetStPrimeBalance = require(rootPrefix + '/lib/getBalance/StPrime'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  TransferStPrimeBatch = require(rootPrefix + '/lib/fund/stPrime/BatchTransfer'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

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
 * Class to fund eth by chain owner.
 *
 * @class
 */
class FundBySealerAuxChainSpecific extends CronBase {
  /**
   * Constructor
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

    // We are converting auxChainId into an array because the cron is only associated with one auxChainId. However,
    // in the code, auxChainIds is used. We are creating an array here so as to not refactor the code right now.
    // TODO: Refactor code to work only on one auxChainId.
    oThis.auxChainIds = [auxChainId];
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

    logger.step('fetch master internal funder address');
    await oThis._fetchMasterInternalFunderAddress();

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
    } else {
      oThis.chainIds = oThis.auxChainIds;
    }
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
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
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
   * Transfer StPrime on all auxChainIds.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _transferStPrimeToAll() {
    const oThis = this;

    // Loop over all auxChainIds.
    for (let i = 0; i < oThis.auxChainIds.length; i++) {
      await oThis._transferStPrimeOnChain(oThis.auxChainIds[i]);
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
    const oThis = this;

    // Fetch all addresses associated to auxChainId.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_f_bs_acs_4',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    let sealerAddresses = [],
      sealerAddressEntities = chainAddressesRsp.data[chainAddressConstants.auxSealerKind];

    if (!sealerAddressEntities || sealerAddressEntities.length == 0) {
      logger.error('No sealer present for aux chain id: ', auxChainId);
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

    for (let i = 0; i < sealerAddresses.length; i++) {
      let sealerAddress = sealerAddresses[i];

      const sealerAddressBalance = currentAddressBalances[sealerAddress];

      logger.debug('sealerAddress-----', sealerAddress);
      logger.debug('sealerAddressBalance-----', sealerAddressBalance);

      if (basicHelper.convertToWei(sealerAddressBalance).gt(basicHelper.convertToWei(1))) {
        oThis.transferDetails.push({
          fromAddress: sealerAddress,
          toAddress: oThis.masterInternalFunderAddress,
          amountInWei: basicHelper
            .convertToWei(sealerAddressBalance)
            .minus(basicHelper.convertToWei(1))
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
