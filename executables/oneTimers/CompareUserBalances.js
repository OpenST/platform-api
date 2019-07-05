const program = require('commander');

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const BigNumber = require('bignumber.js');

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress');

require(rootPrefix + '/lib/cacheManagement/chainMulti/Balance');

program.option('--chainId <chainId>', 'Chain ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/oneTimers/CompareUserBalances.js --chainId 2000');
  logger.log('');
  logger.log('');
});

if (!program.chainId) {
  program.help();
  process.exit(1);
}

/**
 * Class to fetch user balances of all economies and compare them with DB
 *
 */
class CompareUserBalances {
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chainId;
    oThis.configStrategy = null;
    oThis.mismatchBalanceAddresses = {};
  }

  async perform() {
    const oThis = this;

    await oThis._fetchConfigStrategy();

    const tokenAddresses = await new TokenAddressModel({})
      .select('*')
      .where(['kind = 54 AND deployed_chain_id = ?', oThis.chainId])
      .fire();

    for (let index in tokenAddresses) {
      let contractAddress = tokenAddresses[index].address;
      oThis.mismatchBalanceAddresses[contractAddress] = {};
      await oThis._compareBalancesOfEconomy(contractAddress);
    }

    console.log('Total Economies processed: ', Object.keys(oThis.mismatchBalanceAddresses).length);
    console.log('Mismatch addresses: ', oThis.mismatchBalanceAddresses);
  }

  async _fetchConfigStrategy() {
    const oThis = this;

    // Fetch config strategy for chain id.
    const strategyByChainHelperObj = new StrategyByChainHelper(oThis.chainId),
      configStrategyResp = await strategyByChainHelperObj.getComplete();

    // If config strategy not found, then emit SIGINT.
    if (configStrategyResp.isFailure()) {
      logger.error('Could not fetch configStrategy. Exiting the process.');
      process.emit('SIGINT');
    }
    oThis.configStrategy = new InstanceComposer(configStrategyResp.data);
  }

  async _compareBalancesOfEconomy(contractAddress) {
    const oThis = this;

    // Get blockScanner object.
    const blockScannerInstance = await blockScannerProvider.getInstance([oThis.chainId]);
    const EconomyTokenHolderKlass = blockScannerInstance.economy.GetTokenHolders;
    const AddressBalanceKlass = blockScannerInstance.address.GetBalance;
    const DdbBalanceCacheKlass = oThis.configStrategy.getShadowedClassFor(coreConstants.icNameSpace, 'BalanceCache');

    let nextPagePayload = null;
    let addressGethBalances = {};
    let addressDbBalances = {};
    while (true) {
      const tokenHoldersResp = await new EconomyTokenHolderKlass(oThis.chainId, contractAddress, {
        pageSize: 80,
        nextPagePayload: nextPagePayload
      }).perform();

      if (tokenHoldersResp.isSuccess() && tokenHoldersResp.data.tokenHolders.length > 0) {
        let tokenHolders = tokenHoldersResp.data.tokenHolders;
        let tokenHolderAddresses = [];
        for (let i = 0; i < tokenHolders.length; i++) {
          let addr = tokenHolders[i].address;
          tokenHolderAddresses.push(addr);
        }

        // Fetch address balances from geth
        const balancesResp = await new AddressBalanceKlass(
          oThis.chainId,
          contractAddress,
          tokenHolderAddresses
        ).perform();
        if (balancesResp.isSuccess()) {
          for (let key in balancesResp.data) {
            addressGethBalances[key] = balancesResp.data[key].balance;
          }
        }

        const ddbBalancesResp = await new DdbBalanceCacheKlass({
          tokenHolderAddresses: tokenHolderAddresses,
          erc20Address: contractAddress,
          chainId: oThis.chainId
        }).fetch();
        if (ddbBalancesResp.isSuccess()) {
          for (let key in ddbBalancesResp.data) {
            addressDbBalances[key] = ddbBalancesResp.data[key];
          }
        }

        nextPagePayload = tokenHoldersResp.data.nextPagePayload;
      }

      if (!nextPagePayload || !nextPagePayload.LastEvaluatedKey) {
        break;
      }
    }

    let unsettledDebitsNotZeroAddresses = [],
      settledBalanceMismatchAddresses = [],
      pessimisticSettledBalanceMismatchAddresses = [];

    for (const address in addressGethBalances) {
      const gethBalanceBn = new BigNumber(addressGethBalances[address]),
        zeroBigNumber = new BigNumber(0),
        ddbBalance = addressDbBalances[address],
        blockChainUnsettleDebitsBn = new BigNumber(ddbBalance.blockChainUnsettleDebits || 0),
        blockChainSettledBalanceBn = new BigNumber(ddbBalance.blockChainSettledBalance || 0),
        pessimisticSettledBalanceBn = new BigNumber(ddbBalance.pessimisticSettledBalance || 0);

      // BlockChainUnsettleDebits should be equal to zero.
      if (!zeroBigNumber.equals(blockChainUnsettleDebitsBn)) {
        unsettledDebitsNotZeroAddresses.push(address);
      }

      // Balance on geth should be equal to blockChain settled balance.
      if (!gethBalanceBn.equals(blockChainSettledBalanceBn)) {
        settledBalanceMismatchAddresses.push(address);
      }

      if (!pessimisticSettledBalanceBn.equals(blockChainSettledBalanceBn.minus(blockChainUnsettleDebitsBn))) {
        pessimisticSettledBalanceMismatchAddresses.push(address);
      }
    }

    console.log('Token Address checking for: ', contractAddress);
    console.log('Total addresses balance from ddb: ', Object.keys(addressDbBalances).length);
    console.log('Total addresses balance from geth: ', Object.keys(addressGethBalances).length);
    console.log('unsettledDebitsNotZeroAddresses: ', unsettledDebitsNotZeroAddresses);
    console.log('settledBalanceMismatchAddresses: ', settledBalanceMismatchAddresses);
    console.log('pessimisticSettledBalanceMismatchAddresses: ', pessimisticSettledBalanceMismatchAddresses);

    if (
      unsettledDebitsNotZeroAddresses.length > 0 ||
      settledBalanceMismatchAddresses.length > 0 ||
      pessimisticSettledBalanceMismatchAddresses.length > 0
    ) {
      oThis.mismatchBalanceAddresses[contractAddress] = {
        unsettledDebitsNotZeroAddresses: unsettledDebitsNotZeroAddresses,
        settledBalanceMismatchAddresses: settledBalanceMismatchAddresses,
        pessimisticSettledBalanceMismatchAddresses: pessimisticSettledBalanceMismatchAddresses
      };
    }
  }
}

new CompareUserBalances({ chainId: program.chainId }).perform().then(console.log);
