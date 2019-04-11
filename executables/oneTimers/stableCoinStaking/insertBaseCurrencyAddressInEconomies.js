/**
 * Module to insert base currency contract address in  table.
 *
 * @module executables/oneTimers/stableCoinStaking/createBaseCurrenciesTable
 */

const rootPrefix = '../../..',
  tokenConstants = require(rootPrefix + '/lib/globalConstant/token'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  ChainAddressesModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  chainAddressesConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  ClientConfigGroup = require(rootPrefix + '/app/models/mysql/ClientConfigGroup'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

const BATCH_SIZE = 25;

// Following require(s) for registering into instance composer.
require(rootPrefix + '/app/models/ddb/shared/BaseCurrency');

/**
 * Class to create base currencies table.
 *
 * @class CreateBaseCurrenciesTable
 */
class InsertBaseCurrencyAddressInEconomies {
  /**
   * Main performer method for the class.
   *
   * @returns {Promise<void>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(`${__filename}::perform`);

      return responseHelper.error({
        internal_error_identifier: 'e_ot_scs_ibcae_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: err
      });
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this;
    //Fetch ST contract address from chain addresses.
    await oThis._fetchSTContractAddress();

    //Fetch all chain ids.
    await oThis._fetchAllChainIds();

    //Perform chain specific operations
    await oThis._chainSpecificOperations();
  }

  /**
   * Fetch simple token contract address
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchSTContractAddress() {
    const oThis = this;

    let chainAddressObj = new ChainAddressesModel(),
      queryResponse = await chainAddressObj
        .select('address')
        .where(['kind = ?', chainAddressesConstants.invertedKinds[chainAddressesConstants.stContractKind]])
        .fire();

    oThis.stContractAddress = queryResponse[0]['address'];
  }

  async _fetchAllChainIds() {
    const oThis = this;

    oThis.chainIds = await chainConfigProvider.allChainIds();
  }

  /**
   * Performs chain specific operations
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _chainSpecificOperations() {
    const oThis = this;

    for (let i = 0; i < oThis.chainIds.length; i++) {
      let chainId = oThis.chainIds[i],
        ubtAddresses = await oThis._fetchEconomyAddress(chainId);

      await oThis._updateEconomies(ubtAddresses, chainId);
    }
  }

  /**
   * Fetch all utility branded token addresses for tokens deployed on given chain id
   *
   * @param {number} chainId
   *
   * @returns {Promise<Array>} Return array of utility branded token addresses
   *
   * @private
   */
  async _fetchEconomyAddress(chainId) {
    const oThis = this;

    const clientIds = await oThis._fetchClientsOnChain(chainId);

    if (clientIds.length === 0) {
      return [];
    }

    const tokenIds = await oThis._fetchClientTokenIdsFor(clientIds);

    if (tokenIds.length === 0) {
      return [];
    }

    return oThis._fetchUbtAddresses(tokenIds);
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
    // Step 1: Fetch all clientIds associated to auxChainId.
    const chainClientIds = await new ClientConfigGroup()
      .select('client_id')
      .where(['chain_id = (?)', auxChainId])
      .fire();

    const clientIds = [];
    for (let index = 0; index < chainClientIds.length; index++) {
      const clientId = chainClientIds[index].client_id;

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
    // Step 2: Fetch all tokenIds associated to clientIds.
    const clientTokenIds = await new TokenModel()
      .select('id')
      .where([
        'client_id IN (?) AND status = (?)',
        clientIds,
        new TokenModel().invertedStatuses[tokenConstants.deploymentCompleted]
      ])
      .fire();

    const tokenIds = [];
    for (let index = 0; index < clientTokenIds.length; index++) {
      const tokenId = clientTokenIds[index].id;

      tokenIds.push(tokenId);
    }

    return tokenIds;
  }

  /**
   * Fetch ubt addresses for specific token ids.
   *
   * @param {Array} tokenIds
   *
   * @return {Promise<Array>}
   *
   * @private
   */
  async _fetchUbtAddresses(tokenIds) {
    // Step 3: Fetch aux funder addresses associated to tokenIds.
    const tokenUbtAddresses = await new TokenAddressModel()
      .select('address')
      .where([
        'token_id IN (?) AND kind = (?) AND status = (?)',
        tokenIds,
        new TokenAddressModel().invertedKinds[tokenAddressConstants.utilityBrandedTokenContract],
        new TokenAddressModel().invertedStatuses[tokenAddressConstants.activeStatus]
      ])
      .fire();

    return tokenUbtAddresses;
  }

  /**
   * Update all the economies whose ubt address is passed.
   *
   * @param {Array} ubtAddresses
   *
   * @param {Number} chainId
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _updateEconomies(ubtAddresses, chainId) {
    const oThis = this;

    let blockScanner = await blockScannerProvider.getInstance([]),
      economiesModel = blockScanner.model.Economy,
      economiesObj = new economiesModel({}),
      promiseArray = [];

    for (let i = 0; i < ubtAddresses.length; i++) {
      let updateParams = {
        contractAddress: ubtAddresses[i]['address'],
        chainId: chainId,
        baseCurrencyContractAddress: oThis.stContractAddress
      };

      promiseArray.push(economiesObj.updateItem(updateParams));

      if (promiseArray.length >= BATCH_SIZE || ubtAddresses.length === i + 1) {
        await Promise.all(promiseArray);
        promiseArray = [];
      }
    }
  }
}

const insertBaseCurrencyAddressInEconomies = new InsertBaseCurrencyAddressInEconomies();

insertBaseCurrencyAddressInEconomies
  .perform()
  .then(() => {
    console.log('One timer finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.log(`Error: ${err}`);
    process.exit(1);
  });
