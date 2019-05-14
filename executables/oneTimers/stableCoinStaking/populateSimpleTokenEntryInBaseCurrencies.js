// /**
//  *
//  * ********** This one timer script is more supported ***********
//  *
//  * Module to populate simple token entry in base currencies table.
//  *
//  * @module executables/oneTimers/stableCoinStaking/populateSimpleTokenEntryInBaseCurrencies
//  */
//
// const rootPrefix = '../../..',
//   ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
//   UpdateBaseCurrenciesTable = require(rootPrefix + '/lib/stableCoin/UpdateBaseCurrenciesTable'),
//   chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress');
//
// /**
//  * Class to populate simple token entry in base currencies table.
//  *
//  * @class PopulateSimpleTokenEntryInBaseCurrency
//  */
// class PopulateSimpleTokenEntryInBaseCurrency {
//   /**
//    * Main performer for class.
//    *
//    * @return {Promise<void>}
//    */
//   async perform() {
//     const oThis = this;
//
//     await oThis.fetchStContractAddress();
//
//     await oThis.createEntryInBaseCurrenciesTable();
//   }
//
//   /**
//    * Fetch ST Contract address.
//    *
//    * @return {Promise<void>}
//    */
//   async fetchStContractAddress() {
//     const oThis = this;
//
//     // Fetch all addresses associated with origin chain id.
//     const chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
//       chainAddressesRsp = await chainAddressCacheObj.fetch();
//
//     oThis.stContractAddress = chainAddressesRsp.data[chainAddressConstants.stContractKind].address;
//
//     console.log(`Fetched OST contract address. Address: ${oThis.stContractAddress}`);
//   }
//
//   /**
//    * Create OST entry in base currency table.
//    *
//    * @return {Promise<void>}
//    */
//   async createEntryInBaseCurrenciesTable() {
//     const oThis = this;
//
//     await new UpdateBaseCurrenciesTable(oThis.stContractAddress).perform();
//   }
// }
//
// new PopulateSimpleTokenEntryInBaseCurrency()
//   .perform()
//   .then(() => {
//     console.log('One timer finished.');
//     process.exit(0);
//   })
//   .catch((err) => {
//     console.log(`Error: ${err}`);
//     process.exit(1);
//   });
