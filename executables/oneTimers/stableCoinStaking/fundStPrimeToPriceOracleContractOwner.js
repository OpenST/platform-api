/**
 * Fund st prime to price oracle contract owner
 *
 * @module executables/oneTimers/stableCoinStaking/fundStPrimeToPriceOracleContractOwner.js
 */
const program = require('commander');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  StpBatchTransfer = require(rootPrefix + '/lib/fund/stPrime/BatchTransfer'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

program
  .option('--auxChainId <auxChainId>', 'Auxiliary chain id')
  .option('--chainOwner <chainOwner>', 'Chain owner address')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/oneTimers/stableCoinStaking/fundStPrimeToPriceOracleContractOwner.js --auxChainId 204 --chainOwner "0xabc___" '
  );
  logger.log('');
  logger.log('');
});

if (!program.auxChainId || !program.chainOwner) {
  program.help();
  process.exit(1);
}

/**
 * Class to fund st prime to price oracle owner
 *
 * @class FundStpToPriceOracleOwner
 */
class FundStpToPriceOracleOwner {
  /**
   * Constructor
   *
   * @constructor
   *
   * @params
   * @param {Number} auxChainId - auxChainId
   * @param {String} chainOwner - chain owner address
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params.auxChainId;
    oThis.chainOwner = params.chainOwner;
  }

  /**
   * Perform
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    let priceOracleContractOwnerAddress =
      chainAddressesRsp.data[chainAddressConstants.auxPriceOracleContractOwnerKind].address;

    let stpBatchTransfer = new StpBatchTransfer({
      auxChainId: oThis.auxChainId,
      transferDetails: [
        {
          fromAddress: oThis.chainOwner,
          toAddress: priceOracleContractOwnerAddress,
          amountInWei: '800000000000000'
        }
      ]
    });

    await stpBatchTransfer.perform();

    logger.win('=====Price oracle contract owner address', priceOracleContractOwnerAddress);
  }
}

logger.log('Funding price oracle owner.');

new FundStpToPriceOracleOwner({
  auxChainId: program.auxChainId,
  chainOwner: program.chainOwner
})
  .perform()
  .then(function() {
    console.log('====Successfully funded price oracle owner=====');
    process.exit(0);
  })
  .catch(function(err) {
    console.error(err);
    process.exit(1);
  });
