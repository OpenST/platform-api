/**
 * Module to remove aux usdc to usd price oracle contract address from chain addresses table.
 *
 * @module executables/oneTimers/stakeCurrencies2.1/removeUsdcToUsdPriceOracleContractAddress
 */
const program = require('commander');

const rootPrefix = '../../..',
  ChainAddresses = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');

program.option('--auxChainId <auxChainId>', 'aux chainId').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/oneTimers/stakeCurrencies2.1/removeUsdcToUsdPriceOracleContractAddress.js --auxChainId 2000'
  );
  logger.log('');
  logger.log('');
});

if (!program.auxChainId) {
  program.help();
  process.exit(1);
}

/**
 * Class to remove aux usdc to usd price oracle contract address.
 *
 * @class RemoveAddress
 */
class RemoveAddress {
  constructor(auxChainId) {
    const oThis = this;

    oThis.auxChainId = auxChainId;
  }

  /**
   * Perform
   *
   * @returns {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._fetchAddressToRemove();

    await oThis._removeAddress();

    return Promise.resolve();
  }

  /**
   * Fetch chain addresses.
   *
   * @sets oThis.ownerAddress
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchAddressToRemove() {
    const oThis = this;

    const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.auxUsdcToUsdPriceOracleContractAddress =
      chainAddressesRsp.data[chainAddressConstants.auxUsdcToUsdPriceOracleContractKind].address;
    logger.log('auxUsdcToUsdPriceOracleContractAddress: ', oThis.auxUsdcToUsdPriceOracleContractAddress);
  }

  /**
   * Remove auxUsdcToUsdPriceOracleContractAddress
   *
   * @returns {Promise<void>}
   * @private
   */
  async _removeAddress() {
    const oThis = this;

    let chainAddressObj = new ChainAddresses(),
      queryResponse = await chainAddressObj
        .delete('address')
        .where(['address = ?', oThis.auxUsdcToUsdPriceOracleContractAddress])
        .fire();

    logger.log('auxUsdcToUsdPriceOracleContractKind address removed', queryResponse);
  }
}

new RemoveAddress(program.auxChainId)
  .perform()
  .then(() => {
    logger.win('One-timer finished.');
    process.exit(0);
  })
  .catch((err) => {
    logger.error('One-timer failed.', err);
    process.exit(1);
  });
