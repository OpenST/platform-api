'use strict';
/**
 * Cron to fund stPrime and eth by chainOwner.
 *
 * @module executables/funding/byChainOwner/auxChainSpecific
 *
 * This cron expects originChainId and auxChainIds as parameter in the params.
 */
const program = require('commander');

const rootPrefix = '../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  TransferEth = require(rootPrefix + '/lib/transfer/Eth'),
  CronBase = require(rootPrefix + '/executables/CronBase'),
  GetEthBalance = require(rootPrefix + '/lib/getBalance/Eth'),
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  TransferStPrime = require(rootPrefix + '/lib/transfer/StPrime'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  GetStPrimeBalance = require(rootPrefix + '/lib/getBalance/StPrime'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  ClientConfigGroup = require(rootPrefix + '/app/models/mysql/ClientConfigGroup'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  OriginChainAddressesCache = require(rootPrefix + '/lib/sharedCacheManagement/OriginChainAddresses');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/funding/byChainOwner/auxChainSpecific.js --cronProcessId 1');
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
  [chainAddressConstants.facilitator]: '0.53591',
  [chainAddressConstants.adminKind]: '0.00355',
  [chainAddressConstants.deployerKind]: '0.00000',
  [tokenAddressConstants.auxFunderAddressKind]: '0.00240'
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
    return cronProcessesConstants.fundByChainOwnerAuxChainSpecific;
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

    logger.step('Transferring eth to origin chain facilitator.');
    await oThis._transferEthToOriginFacilitators();

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
    const oThis = this;

    let chainAddresses = [];

    // Fetch all addresses associated to auxChainId.
    let fetchAddrRsp = await new ChainAddressModel().fetchAddresses({
      chainId: auxChainId,
      kinds: [chainAddressConstants.adminKind, chainAddressConstants.deployerKind]
    });

    oThis.kindToAddressMap = fetchAddrRsp.data.address;

    let kind = chainAddressConstants.invertedKinds[chainAddressConstants.facilitator],
      whereClause = ['chain_id = ? AND aux_chain_id = ? AND kind = ?', oThis.originChainId, auxChainId, kind],
      facilitatorAddrRsp = await new ChainAddressModel()
        .select('address')
        .where(whereClause)
        .fire();

    oThis.facilitatorAddresses.push(facilitatorAddrRsp[0].address);

    // Fetch aux funder addresses on the auxChainId.

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

    // Step 3: Fetch aux funder addresses associated to tokenIds.
    let tokenIdAuxFunderAddresses = await new TokenAddressModel()
      .select('address')
      .where([
        'token_id IN (?) AND kind = (?)',
        tokenIds,
        new TokenAddressModel().invertedKinds[tokenAddressConstants.auxFunderAddressKind]
      ])
      .fire();

    let auxFunderAddresses = [];
    for (let index = 0; index < tokenIdAuxFunderAddresses.length; index++) {
      let auxFunderAddress = tokenIdAuxFunderAddresses[index].address;

      auxFunderAddresses.push(auxFunderAddress);
      chainAddresses.push(auxFunderAddress);
    }

    for (let addressKinds in oThis.kindToAddressMap) {
      chainAddresses.push(oThis.kindToAddressMap[addressKinds]);
    }

    // Associate addresses to auxChainId.
    oThis.kindToAddressMap[[tokenAddressConstants.auxFunderAddressKind]] = auxFunderAddresses;

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

    // Fetch addresses from map.
    const auxChainAdminAddress = oThis.kindToAddressMap[chainAddressConstants.adminKind],
      auxChainDeployerAddress = oThis.kindToAddressMap[chainAddressConstants.deployerKind],
      auxChainFacilitatorAddress = oThis.kindToAddressMap[chainAddressConstants.facilitator];

    for (let address in currentAddressBalances) {
      let toAddress = '',
        addressMinimumBalance = '',
        addressCurrentBalance = basicHelper.convertToBigNumber(currentAddressBalances[address]);

      let minimumBalanceRequiredForAddress = null;

      switch (address) {
        // Admin kind.
        case auxChainAdminAddress:
          minimumBalanceRequiredForAddress = basicHelper.convertToBigNumber(
            fundingConfig[chainAddressConstants.adminKind]
          );
          if (addressCurrentBalance < minimumBalanceRequiredForAddress.mul(flowsForMinimumBalance)) {
            toAddress = address;
            addressMinimumBalance = minimumBalanceRequiredForAddress;
          }
          break;

        // Deployer kind.
        case auxChainDeployerAddress:
          minimumBalanceRequiredForAddress = basicHelper.convertToBigNumber(
            fundingConfig[chainAddressConstants.deployerKind]
          );
          if (addressCurrentBalance < minimumBalanceRequiredForAddress.mul(flowsForMinimumBalance)) {
            toAddress = address;
            addressMinimumBalance = minimumBalanceRequiredForAddress;
          }
          break;

        // Facilitator kind.
        case auxChainFacilitatorAddress:
          minimumBalanceRequiredForAddress = basicHelper.convertToBigNumber(
            fundingConfig[chainAddressConstants.facilitator]
          );
          if (addressCurrentBalance < minimumBalanceRequiredForAddress.mul(flowsForMinimumBalance)) {
            toAddress = address;
            addressMinimumBalance = minimumBalanceRequiredForAddress;
          }
          break;

        // Aux funder address kind.
        default:
          minimumBalanceRequiredForAddress = basicHelper.convertToBigNumber(
            fundingConfig[tokenAddressConstants.auxFunderAddressKind]
          );

          if (addressCurrentBalance < minimumBalanceRequiredForAddress.mul(flowsForMinimumBalance)) {
            toAddress = address;
            addressMinimumBalance = minimumBalanceRequiredForAddress;
          }
          break;
      }

      if (toAddress && addressMinimumBalance) {
        let params = {
          from: oThis.chainOwnerAddress,
          to: toAddress,
          amountInWei: basicHelper.convertToWei(addressMinimumBalance.mul(flowsForTransferBalance)).toString(10)
        };
        oThis.transferDetails.push(params);
      }
    }
  }

  /**
   * Transfer eth to origin chain facilitator.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _transferEthToOriginFacilitators() {
    const oThis = this;

    logger.step('Fetching addresses from origin chain.');

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new OriginChainAddressesCache(),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_f_bco_spe_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    oThis.chainOwnerAddress = chainAddressesRsp.data[chainAddressConstants.chainOwnerKind];
    oThis.transferDetails = [];

    logger.step('Fetching balances of addresses from origin chain.');

    // Fetch eth balance of facilitators on origin chain.
    const getEthBalance = new GetEthBalance({
      originChainId: oThis.originChainId,
      addresses: oThis.facilitatorAddresses
    });

    const addressToBalanceMap = await getEthBalance.perform();

    for (let address in addressToBalanceMap) {
      let facilitatorCurrentBalance = basicHelper.convertToBigNumber(addressToBalanceMap[address]),
        facilitatorMinimumBalance = basicHelper.convertToBigNumber(fundingConfig[chainAddressConstants.facilitator]);

      if (facilitatorCurrentBalance.lt(facilitatorMinimumBalance.mul(flowsForMinimumBalance))) {
        let params = {
          from: oThis.chainOwnerAddress,
          to: address,
          amountInWei: basicHelper.convertToWei(facilitatorMinimumBalance.mul(flowsForTransferBalance))
        };

        oThis.transferDetails.push(params);
      }
    }

    if (oThis.transferDetails.length > 0) {
      oThis.canExit = false;

      const transferEth = new TransferEth({
        originChainId: oThis.originChainId,
        transferDetails: oThis.transferDetails
      });

      await transferEth.perform();

      oThis.canExit = true;
    }
  }
}

logger.log('Starting cron to fund eth by chainOwner.');

new FundByChainOwnerAuxChainSpecific({ cronProcessId: +program.cronProcessId }).perform();
