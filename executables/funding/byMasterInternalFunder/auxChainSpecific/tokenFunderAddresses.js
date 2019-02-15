'use strict';
/**
 * Cron to fund stPrime by chainOwner to token funder addresses.
 *
 * @module executables/funding/byMasterInternalFunder/auxChainSpecific/tokenFunderAddresses
 *
 * This cron expects originChainId and auxChainIds as parameter in the params.
 */
const program = require('commander');

const rootPrefix = '../../../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  tokenConstants = require(rootPrefix + '/lib/globalConstant/token'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  ClientConfigGroup = require(rootPrefix + '/app/models/mysql/ClientConfigGroup'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses'),
  AuxChainSpecificFundingCronBase = require(rootPrefix +
    '/executables/funding/byMasterInternalFunder/auxChainSpecific/Base');

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/funding/byMasterInternalFunder/auxChainSpecific/tokenFunderAddresses.js --cronProcessId 16'
  );
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
  originMaxGasPriceMultiplierWithBuffer = basicHelper.getOriginMaxGasPriceMultiplierWithBuffer();

// Config for Per Token addresses which need to be funded per chain by OST Prime
const stPrimeFundingPerTokenConfig = {
  [tokenAddressConstants.auxFunderAddressKind]: {
    oneGWeiMinOSTPrimeAmount: '0.00000',
    fundForFlows: flowsForTransferBalance,
    fundIfLessThanFlows: flowsForMinimumBalance
  }
};

/**
 * Class to fund StPrime by chain owner to token funder addresses.
 *
 * @class
 */
class fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses extends AuxChainSpecificFundingCronBase {
  /**
   * Constructor to fund StPrime by chain owner to token funder addresses.
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
    return cronProcessesConstants.fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses;
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
   * Send ST Prime funds on all aux chains
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _sendFundsIfNeeded() {
    const oThis = this;

    // Loop over all auxChainIds.
    for (let index = 0; index < oThis.auxChainIds.length; index++) {
      let auxChainId = oThis.auxChainIds[index];

      logger.step('** Starting auxChainId: ', auxChainId);

      logger.step(
        'Fetching chain specific token funder addresses for all clients and populating per token funding config'
      );
      let perTokenFundingConfig = await oThis._createDuplicateTokenFundingConfigFor(auxChainId);

      if (!perTokenFundingConfig[[tokenAddressConstants.auxFunderAddressKind]].addresses) {
        logger.error('No token addresses found on chainId: ', auxChainId);
        continue;
      }

      let tokenAddresses = perTokenFundingConfig[[tokenAddressConstants.auxFunderAddressKind]].addresses;

      logger.step('Fetching balances for chain addresses on auxChainId: ' + auxChainId);
      let addressesToBalanceMap = await oThis._fetchStPrimeBalance(auxChainId, tokenAddresses);

      logger.step('Fund chain specific addresses with StPrime if needed');
      await oThis._checkEligibilityAndTransferFunds(auxChainId, perTokenFundingConfig, addressesToBalanceMap);
    }
  }

  /**
   * Create local copy of token funding config for specific chain id
   *
   * @param {Number} auxChainId
   *
   * @return {Object} perTokenFundingConfig
   *
   * @private
   */
  async _createDuplicateTokenFundingConfigFor(auxChainId) {
    const oThis = this;

    // Fetch all addresses associated to auxChainId.
    let perTokenFundingConfig = basicHelper.deepDup(stPrimeFundingPerTokenConfig);

    logger.step('Fetching token addresses on auxChainId: ' + auxChainId);

    let clientIds = await oThis._fetchClientsOnChain(auxChainId);

    if (clientIds.length === 0) {
      return perTokenFundingConfig;
    }

    let tokenIds = await oThis._fetchClientTokenIdsFor(clientIds);

    if (tokenIds.length === 0) {
      return perTokenFundingConfig;
    }

    let tokenFunderAddresses = await oThis._fetchTokenFunderAddresses(tokenIds),
      tokenFunderAddressesLength = tokenFunderAddresses.length;

    if (tokenFunderAddressesLength === 0) {
      return perTokenFundingConfig;
    }
    for (let index = 0; index < tokenFunderAddressesLength; index += 1) {
      perTokenFundingConfig[[tokenAddressConstants.auxFunderAddressKind]].addresses =
        perTokenFundingConfig[[tokenAddressConstants.auxFunderAddressKind]].addresses || [];
      perTokenFundingConfig[[tokenAddressConstants.auxFunderAddressKind]].addresses.push(
        tokenFunderAddresses[index].address
      );
    }

    return perTokenFundingConfig;
  }

  /**
   * Fetch all client ids on specific chain.
   *
   * @param {Number} auxChainId
   *
   * @return {Promise<Array>}
   *
   * @private
   */
  async _fetchClientsOnChain(auxChainId) {
    const oThis = this;

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

    return clientIds;
  }

  /**
   * Fetch token ids for specific clients.
   *
   * @param {Array} clientIds
   *
   * @return {Promise<Array>}
   *
   * @private
   */
  async _fetchClientTokenIdsFor(clientIds) {
    const oThis = this;

    // Step 2: Fetch all tokenIds associated to clientIds.
    let clientTokenIds = await new TokenModel()
      .select('id')
      .where([
        'client_id IN (?) AND status = (?)',
        clientIds,
        new TokenModel().invertedStatuses[tokenConstants.deploymentCompleted]
      ])
      .fire();

    let tokenIds = [];
    for (let index = 0; index < clientTokenIds.length; index++) {
      let tokenId = clientTokenIds[index].id;

      tokenIds.push(tokenId);
    }

    return tokenIds;
  }

  /**
   * Fetch funder addresses for specific token ids.
   *
   * @param {Array} tokenIds
   *
   * @return {Promise<Array>}
   *
   * @private
   */
  async _fetchTokenFunderAddresses(tokenIds) {
    const oThis = this;

    // Step 3: Fetch aux funder addresses associated to tokenIds.
    let tokenIdAuxFunderAddresses = await new TokenAddressModel()
      .select('address')
      .where([
        'token_id IN (?) AND kind = (?) AND status = (?)',
        tokenIds,
        new TokenAddressModel().invertedKinds[tokenAddressConstants.auxFunderAddressKind],
        new TokenAddressModel().invertedStatuses[tokenAddressConstants.activeStatus]
      ])
      .fire();

    return tokenIdAuxFunderAddresses;
  }

  /**
   * Check if token addresses are eligible for funding and transfer them funds.
   *
   * @param {Number} auxChainId
   * @param {Object} perTokenFundingConfig
   * @param {Object} addressesToBalanceMap
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _checkEligibilityAndTransferFunds(auxChainId, perTokenFundingConfig, addressesToBalanceMap) {
    const oThis = this;

    let transferDetails = [],
      fundingAddressDetails = perTokenFundingConfig[[tokenAddressConstants.auxFunderAddressKind]],
      addressMinimumBalance = basicHelper
        .convertToWei(String(fundingAddressDetails.oneGWeiMinOSTPrimeAmount))
        .mul(basicHelper.convertToBigNumber(originMaxGasPriceMultiplierWithBuffer));

    for (let address in addressesToBalanceMap) {
      let addressCurrentBalance = basicHelper.convertToBigNumber(addressesToBalanceMap[address]),
        addressMinimumBalanceRequiredForGivenFlows = addressMinimumBalance.mul(
          fundingAddressDetails.fundIfLessThanFlows
        );

      logger.log('Address: ', address);
      logger.log('Current balance of address: ', addressCurrentBalance.toString(10));
      logger.log('Minimum required balance of address: ', addressMinimumBalance.toString(10));
      logger.log(
        'Minimum required balance of address for required flows: ',
        addressMinimumBalanceRequiredForGivenFlows.toString(10)
      );

      if (addressCurrentBalance.lt(addressMinimumBalanceRequiredForGivenFlows)) {
        let amountToBeTransferred = addressMinimumBalance.mul(fundingAddressDetails.fundForFlows).toString(10),
          transferParams = {
            fromAddress: oThis.masterInternalFunderAddress,
            toAddress: address,
            amountInWei: amountToBeTransferred
          };
        logger.log('Funds transferred are: ', amountToBeTransferred);
        transferDetails.push(transferParams);
      }
    }

    // Start transfer.
    oThis.canExit = false;

    if (transferDetails.length > 0) {
      logger.step('Transferring StPrime to token addresses on auxChainId: ' + auxChainId);

      await oThis._transferStPrime(auxChainId, transferDetails);
    } else {
      logger.step('None of the addresses had lower than threshold balance on chainId: ', auxChainId);
    }
    oThis.canExit = true;
  }
}

logger.log('Starting cron to fund StPrime by chainOwner to token funder addresses.');

new fundByMasterInternalFunderAuxChainSpecificTokenFunderAddresses({ cronProcessId: +program.cronProcessId })
  .perform()
  .then(function() {
    process.emit('SIGINT');
  })
  .catch(function() {
    process.emit('SIGINT');
  });
