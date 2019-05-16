// /**
//  *
//  * ********This one timer script is no more supported ***********
//  *
//  * Module to insert base currency contract address in economies table.
//  *
//  * @module executables/oneTimers/stableCoinStaking/insertBaseCurrencyAddressInEconomies
//  */
//
// const rootPrefix = '../../..',
//   TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
//   TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
//   ClientConfigGroup = require(rootPrefix + '/app/models/mysql/ClientConfigGroup'),
//   ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
//   responseHelper = require(rootPrefix + '/lib/formatter/response'),
//   logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
//   tokenConstants = require(rootPrefix + '/lib/globalConstant/token'),
//   chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
//   blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
//   chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
//   tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');
//
// const BATCH_SIZE = 25;
//
// // Following require(s) for registering into instance composer.
// require(rootPrefix + '/app/models/ddb/shared/BaseCurrency');
//
// /**
//  * Class to insert base currency contract address in economies table.
//  *
//  * @class CreateBaseCurrenciesTable
//  */
// class InsertBaseCurrencyAddressInEconomies {
//   /**
//    * Main performer method for the class.
//    *
//    * @returns {Promise<void>}
//    */
//   perform() {
//     const oThis = this;
//
//     return oThis.asyncPerform().catch(function(err) {
//       logger.error(`${__filename}::perform`);
//
//       return responseHelper.error({
//         internal_error_identifier: 'e_ot_scs_ibcae_1',
//         api_error_identifier: 'something_went_wrong',
//         debug_options: err
//       });
//     });
//   }
//
//   /**
//    * Async performer.
//    *
//    * @returns {Promise<void>}
//    */
//   async asyncPerform() {
//     const oThis = this;
//
//     // Fetch ST contract address from chain addresses.
//     await oThis._fetchStContractAddress();
//
//     // Fetch all chain ids.
//     await oThis._fetchAllAuxChainIds();
//
//     // Perform chain specific operations.
//     await oThis._chainSpecificOperations();
//   }
//
//   /**
//    * Fetch simple token contract address.
//    *
//    * @sets oThis.stContractAddress
//    *
//    * @returns {Promise<void>}
//    * @private
//    */
//   async _fetchStContractAddress() {
//     const oThis = this;
//
//     // Fetch all addresses associated with origin chain id.
//     const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
//       chainAddressesRsp = await chainAddressCacheObj.fetch();
//
//     oThis.stContractAddress = chainAddressesRsp.data[chainAddressConstants.stContractKind].address;
//   }
//
//   /**
//    * Fetch all chainIds.
//    *
//    * @sets oThis.chainIds
//    *
//    * @return {Promise<void>}
//    * @private
//    */
//   async _fetchAllAuxChainIds() {
//     const oThis = this;
//
//     oThis.chainIds = await chainConfigProvider.allAuxChainIds();
//   }
//
//   /**
//    * Performs chain specific operations.
//    *
//    * @returns {Promise<void>}
//    * @private
//    */
//   async _chainSpecificOperations() {
//     const oThis = this;
//
//     for (let index = 0; index < oThis.chainIds.length; index++) {
//       const chainId = oThis.chainIds[index],
//         ubtAddresses = await oThis._fetchEconomyAddress(chainId);
//
//       await oThis._updateEconomies(ubtAddresses, chainId);
//     }
//   }
//
//   /**
//    * Fetch all utility branded token addresses for tokens deployed on given chain id.
//    *
//    * @param {number} chainId
//    *
//    * @returns {Promise<Array>} Return array of utility branded token addresses.
//    * @private
//    */
//   async _fetchEconomyAddress(chainId) {
//     const oThis = this;
//
//     const clientIds = await oThis._fetchClientsOnChain(chainId);
//
//     if (clientIds.length === 0) {
//       return [];
//     }
//
//     const tokenIds = await oThis._fetchClientTokenIdsFor(clientIds);
//
//     if (tokenIds.length === 0) {
//       return [];
//     }
//
//     return oThis._fetchUbtAddresses(tokenIds);
//   }
//
//   /**
//    * Fetch all client ids on specific chain.
//    *
//    * @param {number} auxChainId
//    *
//    * @return {Promise<Array>}
//    * @private
//    */
//   async _fetchClientsOnChain(auxChainId) {
//     // Step 1: Fetch all clientIds associated to auxChainId.
//     const chainClientIds = await new ClientConfigGroup()
//       .select('client_id')
//       .where(['chain_id = (?)', auxChainId])
//       .fire();
//
//     const clientIds = [];
//
//     for (let index = 0; index < chainClientIds.length; index++) {
//       const clientId = chainClientIds[index].client_id;
//
//       clientIds.push(clientId);
//     }
//
//     return clientIds;
//   }
//
//   /**
//    * Fetch token ids for specific clients.
//    *
//    * @param {array<number>} clientIds
//    *
//    * @return {Promise<Array>}
//    * @private
//    */
//   async _fetchClientTokenIdsFor(clientIds) {
//     // Step 2: Fetch all tokenIds associated to clientIds.
//     const clientTokenIds = await new TokenModel()
//       .select('id')
//       .where([
//         'client_id IN (?) AND status = (?)',
//         clientIds,
//         new TokenModel().invertedStatuses[tokenConstants.deploymentCompleted]
//       ])
//       .fire();
//
//     const tokenIds = [];
//     for (let index = 0; index < clientTokenIds.length; index++) {
//       const tokenId = clientTokenIds[index].id;
//
//       tokenIds.push(tokenId);
//     }
//
//     return tokenIds;
//   }
//
//   /**
//    * Fetch ubt addresses for specific token ids.
//    *
//    * @param {array<number>} tokenIds
//    *
//    * @return {Promise<*>}
//    * @private
//    */
//   async _fetchUbtAddresses(tokenIds) {
//     // Step 3: Fetch aux funder addresses associated to tokenIds.
//     const tokenUbtAddresses = await new TokenAddressModel()
//       .select('address')
//       .where([
//         'token_id IN (?) AND kind = (?) AND status = (?)',
//         tokenIds,
//         new TokenAddressModel().invertedKinds[tokenAddressConstants.utilityBrandedTokenContract],
//         new TokenAddressModel().invertedStatuses[tokenAddressConstants.activeStatus]
//       ])
//       .fire();
//
//     return tokenUbtAddresses;
//   }
//
//   /**
//    * Update all the economies whose ubt address is passed.
//    *
//    * @param {array<string>} ubtAddresses
//    * @param {number} chainId
//    *
//    * @returns {Promise<void>}
//    * @private
//    */
//   async _updateEconomies(ubtAddresses, chainId) {
//     const oThis = this;
//
//     const blockScanner = await blockScannerProvider.getInstance([]),
//       economiesModel = blockScanner.model.Economy,
//       economiesObj = new economiesModel({});
//
//     let promiseArray = [];
//
//     for (let index = 0; index < ubtAddresses.length; index++) {
//       const updateParams = {
//         contractAddress: ubtAddresses[index].address,
//         chainId: chainId,
//         baseCurrencyContractAddress: oThis.stContractAddress
//       };
//
//       promiseArray.push(economiesObj.updateItem(updateParams));
//
//       if (promiseArray.length >= BATCH_SIZE || ubtAddresses.length === index + 1) {
//         await Promise.all(promiseArray);
//         promiseArray = [];
//       }
//     }
//   }
// }
//
// const insertBaseCurrencyAddressInEconomies = new InsertBaseCurrencyAddressInEconomies();
//
// insertBaseCurrencyAddressInEconomies
//   .perform()
//   .then(() => {
//     console.log('One timer finished.');
//     process.exit(0);
//   })
//   .catch((err) => {
//     console.log(`Error: ${err}`);
//     process.exit(1);
//   });
