const rootPrefix = '..',
  program = require('commander'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId');

require(rootPrefix + '/lib/BalanceCorrector');

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

program
  .option('--ubtToTokenHoldersMap <ubtToTokenHoldersMap>', 'UBT address to token holder addresses map')
  .option('--auxChainId <auxChainId>', 'Auxiliary chain id')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    "    node executables/balanceCorrector.js --auxChainId 2000 --ubtToTokenHoldersMap '{ '0x8133fdf385f9c6fcf3dbe780156f05e09bbb4beb': ['0xfd0423fc05542396645b025570ec001d7a542224', '0xe5d8be3b0da9413babd74df6cb5a3c8a3746ea8a'] }' "
  );
  logger.log('');
  logger.log('');
});

if (!program.ubtToTokenHoldersMap) {
  program.help();
  process.exit(1);
}

class BalanceCorrector {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    const oThis = this;

    oThis.ubtAddressToTokenHoldersMap = params.ubtAddressToTokenHoldersMap;
    oThis.auxChainId = params.auxChainId;
  }

  /**
   * Perform
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this,
      strategyByChainHelperObj = new StrategyByChainHelper(oThis.auxChainId),
      configStrategyResp = await strategyByChainHelperObj.getComplete(),
      ic = new InstanceComposer(configStrategyResp.data),
      BalanceCorrector = ic.getShadowedClassFor(coreConstants.icNameSpace, 'BalanceCorrector'),
      balanceCorrector = new BalanceCorrector({
        ubtAddressToTokenHoldersMap: oThis.ubtAddressToTokenHoldersMap
      });

    await balanceCorrector.perform();
  }
}

let balanceCorrector = new BalanceCorrector({
  ubtAddressToTokenHoldersMap: JSON.parse(program.ubtToTokenHoldersMap),
  auxChainId: +program.auxChainId
});

balanceCorrector
  .perform()
  .then(function() {
    console.log('==== Corrected balance successfully!! ====');
  })
  .catch(function(err) {
    console.error('===There seems to be an error in balance correction\n', err);
  });
