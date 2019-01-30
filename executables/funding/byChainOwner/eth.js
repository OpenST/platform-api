'use strict';
/**
 * Cron to fund eth by chainOwner.
 *
 * @module executables/funding/byChainOwner/eth
 *
 * This cron expects originChainId as a parameter in the params.
 */
const program = require('commander');

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  TransferEth = require(rootPrefix + '/lib/transfer/Eth'),
  CronBase = require(rootPrefix + '/executables/CronBase'),
  GetEthBalance = require(rootPrefix + '/lib/getBalance/Eth'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  environmentInfoConstants = require(rootPrefix + '/lib/globalConstant/environmentInfo'),
  OriginChainAddressesCache = require(rootPrefix + '/lib/sharedCacheManagement/OriginChainAddresses');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/funding/byChainOwner/eth.js --cronProcessId 1');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

// Declare variables.
const flowsForMinimumBalance = coreConstants.FLOWS_FOR_MINIMUM_BALANCE,
  flowsForTransferBalance = coreConstants.FLOWS_FOR_TRANSFER_BALANCE,
  flowsForGranterMinimumBalance = coreConstants.FLOWS_FOR_GRANTER_ECONOMY_SETUP;

// Config for addresses which need to be funded.
const fundingConfig = {
  [chainAddressConstants.deployerKind]: '0.53591',
  [chainAddressConstants.ownerKind]: '0.00355',
  [chainAddressConstants.adminKind]: '0.00000',
  [chainAddressConstants.tokenAdminKind]: '0.00240',
  [chainAddressConstants.tokenWorkerKind]: '0.00172',
  [chainAddressConstants.simpleTokenOwnerKind]: '0.03141',
  [chainAddressConstants.simpleTokenAdminKind]: '0.00071',
  [chainAddressConstants.chainOwnerKind]: '0.01160',
  [chainAddressConstants.granterKind]: '0.00000'
};

// Address kinds on which alert email is to be sent.
const alertAddressKinds = [[chainAddressConstants.chainOwnerKind], [chainAddressConstants.granterKind]];

/**
 * Class to fund eth by chain owner.
 *
 * @class
 */
class FundEthByChainOwner extends CronBase {
  /**
   * Constructor to fund eth by chain owner.
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
    return cronProcessesConstants.fundEthByChainOwner;
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
          internal_error_identifier: 'e_f_bco_e_1',
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

    logger.step('Fetching addresses which need to be funded.');
    await oThis._fetchAddresses();

    logger.step('Fetching balances of addresses.');
    await oThis._fetchBalances();

    logger.step('Checking balance of chain owner.');
    await oThis._checkSenderBalance();

    logger.step('Checking if addresses are eligible for transfer.');
    await oThis._checkIfEligibleForTransfer();

    logger.step('Transferring amount.');
    await oThis._transfer();

    logger.step('Cron completed.');
  }

  /**
   * Fetch addresses which need to be funded.
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _fetchAddresses() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new OriginChainAddressesCache(),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_f_bco_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.chainOwnerAddress = chainAddressesRsp.data[chainAddressConstants.chainOwnerKind];

    const deployerAddress = chainAddressesRsp.data[chainAddressConstants.deployerKind],
      ownerAddress = chainAddressesRsp.data[chainAddressConstants.ownerKind],
      adminAddress = chainAddressesRsp.data[chainAddressConstants.adminKind],
      tokenAdminAddress = chainAddressesRsp.data[chainAddressConstants.tokenAdminKind],
      tokenWorkerAddress = chainAddressesRsp.data[chainAddressConstants.tokenWorkerKind];

    // Addresses whose balances need to be fetched.
    oThis.addresses = [
      oThis.chainOwnerAddress,
      deployerAddress,
      ownerAddress,
      adminAddress,
      tokenAdminAddress,
      tokenWorkerAddress
    ];

    // Add addresses mapped to their kind.
    oThis.kindToAddressMap = {
      [chainAddressConstants.deployerKind]: deployerAddress,
      [chainAddressConstants.ownerKind]: ownerAddress,
      [chainAddressConstants.adminKind]: adminAddress,
      [chainAddressConstants.tokenAdminKind]: tokenAdminAddress,
      [chainAddressConstants.tokenWorkerKind]: tokenWorkerAddress,
      [chainAddressConstants.chainOwnerKind]: oThis.chainOwnerAddress
    };

    // If environment is not production and subEnvironment is main, then fetch two more addresses.
    if (
      coreConstants.environment !== environmentInfoConstants.environment.production &&
      coreConstants.subEnvironment === environmentInfoConstants.subEnvironment.main
    ) {
      // Fetch addresses.
      oThis.granterAddress = chainAddressesRsp.data[chainAddressConstants.granterKind];
      const simpleTokenOwnerAddress = chainAddressesRsp.data[chainAddressConstants.simpleTokenOwnerKind],
        simpleTokenAdminAddress = chainAddressesRsp.data[chainAddressConstants.simpleTokenAdminKind];

      // Add addresses to the array of addresses whose balance is to be fetched.
      oThis.addresses.push.apply(oThis.addresses, [
        oThis.granterAddress,
        simpleTokenOwnerAddress,
        simpleTokenAdminAddress
      ]);

      // Add addresses mapped to their kind.
      oThis.kindToAddressMap[[chainAddressConstants.granterKind]] = oThis.granterAddress;
      oThis.kindToAddressMap[[chainAddressConstants.simpleTokenOwnerKind]] = simpleTokenOwnerAddress;
      oThis.kindToAddressMap[[chainAddressConstants.simpleTokenAdminKind]] = simpleTokenAdminAddress;
    }
  }

  /**
   * Fetch balances for all the addresses.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchBalances() {
    const oThis = this;

    // Fetch eth balances
    const getEthBalance = new GetEthBalance({
      originChainId: oThis.originChainId,
      addresses: oThis.addresses
    });

    oThis.addressToBalanceMap = await getEthBalance.perform();
  }

  /**
   * Check sender balance which in this case is chain owner. If sender balance is less than minimum balance, return failure. Sender here is chainOwner.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _checkSenderBalance() {
    const oThis = this,
      addressKind = [chainAddressConstants.chainOwnerKind],
      senderCurrentBalance = oThis.addressToBalanceMap[oThis.chainOwnerAddress],
      senderMinimumBalance = fundingConfig[addressKind];

    if (senderCurrentBalance < senderMinimumBalance * flowsForMinimumBalance) {
      logger.warn('addressKind ' + addressKind + ' has low balance on chainId: ' + oThis.originChainId);
      logger.notify('e_f_bco_3', 'Low balance of addressKind: ' + addressKind + '. on chainId: ', +oThis.originChainId);

      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_f_bco_e_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            senderAddress: oThis.chainOwnerAddress,
            senderCurrentBalanace: senderCurrentBalance,
            senderMinimumBalance: senderMinimumBalance
          }
        })
      );
    }
  }

  /**
   * Check which addresses are eligible to get funds and prepare params for transfer.
   *
   * @private
   */
  _checkIfEligibleForTransfer() {
    const oThis = this;

    oThis.addressesToBeTransferredTo = [];

    // Loop over oThis.kindToAddressMap.
    for (let addressKind in oThis.kindToAddressMap) {
      let address = oThis.kindToAddressMap[addressKind],
        addressMinimumBalance = fundingConfig[addressKind],
        addressCurrentBalance = oThis.addressToBalanceMap[address];

      // If addressKind is granter and it has less than threshold balance, send an error email.
      if (
        addressKind === [chainAddressConstants.granterKind] &&
        addressCurrentBalance < addressMinimumBalance * flowsForGranterMinimumBalance
      ) {
        logger.warn('addressKind ' + addressKind + ' has low balance on chainId: ' + oThis.originChainId);
        logger.notify(
          'e_f_bco_5',
          'Low balance of addressKind: ' + addressKind + '. on chainId: ',
          +oThis.originChainId
        );
      }

      // If address current balance is less thant the stipulated amount, these addresses need to be funded.
      else if (addressCurrentBalance < addressMinimumBalance * flowsForMinimumBalance) {
        let params = {
          from: oThis.chainOwnerAddress,
          to: address,
          amountInWei: basicHelper.convertToWei(addressMinimumBalance * flowsForTransferBalance)
        };
        oThis.addressesToBeTransferredTo.push(params);
      }
    }
  }

  /**
   * Transfer eth.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _transfer() {
    const oThis = this;

    oThis.canExit = false;

    if (oThis.addressesToBeTransferredTo.length > 0) {
      const transferEth = new TransferEth(oThis.addressesToBeTransferredTo);

      await transferEth.perform();
    }
    oThis.canExit = true;
  }
}

logger.log('Starting cron to fund eth by chainOwner.');

new FundEthByChainOwner({ cronProcessId: +program.cronProcessId }).perform();
