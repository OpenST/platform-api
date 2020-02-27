/**
 * This script populates redemption products countries table for given csv.
 *
 * Usage:- node executables/redemptionProducts/populateRedemptionProductCountries.js
 *
 * @module executables/redemptionProducts/populateRedemptionProductCountries
 */

const csvParser = require('csv-parser'),
  path = require('path'),
  fs = require('fs');

const rootPrefix = '../..',
  RedemptionProductCountryModel = require(rootPrefix + '/app/models/mysql/RedemptionProductCountry'),
  RedemptionProductModel = require(rootPrefix + '/app/models/mysql/RedemptionProduct'),
  RedemptionCountryModel = require(rootPrefix + '/app/models/mysql/Country'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const seedDataCsvPath = path.join(__dirname, rootPrefix + '/tests/redemptionProductCountriesSeedData.csv');

const BATCH_SIZE = 30;

class PopulateRedemptionProductCountries {
  constructor(params) {
    const oThis = this;

    oThis.csvRows = [];
    oThis.redemptionProductsNames = [];
    oThis.countryIsoCodes = [];

    oThis.redemptionProductNameToIdMap = {};
    oThis.countryIsoCodeToCountryIdMap = {};
  }

  async perform() {
    const oThis = this;

    await oThis._readDataFromCsv();

    await oThis._fetchRedemptionProductIds();

    await oThis._fetchCountryIds();

    await oThis._insertIntoTable();
  }

  /**
   * read data from input csv.
   *
   * @Sets oThis.csvRows, oThis.redemptionProductsNames, oThis.countryIsoCodes
   *
   * @returns {Promise<void>}
   * @private
   */
  async _readDataFromCsv() {
    const oThis = this;

    return new Promise(function(onResolve) {
      try {
        // eslint-disable-next-line no-sync
        if (fs.existsSync(seedDataCsvPath)) {
          fs.createReadStream(seedDataCsvPath)
            .pipe(csvParser())
            .on('data', function(csvRow) {
              // console.log('csvRow======', csvRow);
              oThis.csvRows.push(csvRow);
              oThis.redemptionProductsNames.push(csvRow.redemption_product.toLowerCase());
              oThis.countryIsoCodes.push(csvRow.country_iso_code);
            })
            .on('end', function() {
              onResolve(oThis.csvRows);
            });
        } else {
          return onResolve(oThis.csvRows);
        }
      } catch (err) {
        return onResolve(oThis.csvRows);
      }
    });
  }

  /**
   * Fetch redemption product ids.
   *
   * @Sets oThis.redemptionProductNameToIdMap
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchRedemptionProductIds() {
    const oThis = this;

    console.log('oThis.csvRows------', oThis.csvRows);

    oThis.redemptionProductsNames = [...new Set(oThis.redemptionProductsNames)];

    let dbRows = await new RedemptionProductModel()
      .select('*')
      .where({
        name: oThis.redemptionProductsNames
      })
      .fire();

    if (dbRows.length === 0 || dbRows.length < oThis.redemptionProductsNames.length) {
      console.log(
        'CSV file contains some redemption products which do not present in redemptions products table.\nPlease verify.'
      );
    }

    for (let ind = 0; ind < dbRows.length; ind++) {
      let dbRow = dbRows[ind];
      oThis.redemptionProductNameToIdMap[dbRow.name.toLowerCase()] = dbRow.id;
    }

    console.log('oThis.redemptionProductNameToIdMap------', oThis.redemptionProductNameToIdMap);
  }

  /**
   * Fetch country ids.
   *
   * @sets oThis.countryIsoCodeToCountryIdMap
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchCountryIds() {
    const oThis = this;

    oThis.countryIsoCodes = [...new Set(oThis.countryIsoCodes)];

    let dbRows = await new RedemptionCountryModel()
      .select('*')
      .where({
        country_iso_code: oThis.countryIsoCodes
      })
      .fire();

    if (dbRows.length === 0 || dbRows.length < oThis.countryIsoCodes.length) {
      console.log('CSV file contains some countries which do not present in countries table.\nPlease verify.');
    }

    for (let ind = 0; ind < dbRows.length; ind++) {
      let dbRow = dbRows[ind];
      oThis.countryIsoCodeToCountryIdMap[dbRow.country_iso_code] = dbRow.id;
    }

    console.log('oThis.countryIsoCodeToCountryIdMap------', oThis.countryIsoCodeToCountryIdMap);
  }

  /**
   * Insert into Redemption Product Country table.
   *
   * @returns {Promise<void>}
   * @private
   */
  async _insertIntoTable() {
    const oThis = this;

    const unableToInsertCsvRows = [];

    while (true) {
      let batchedCsvRows = oThis.csvRows.splice(0, BATCH_SIZE);

      if (batchedCsvRows.length == 0) {
        break;
      }

      let insertColumns = ['redemption_product_id', 'country_id', 'redemption_options'],
        insertMultipleValues = [];

      for (let arrayIndex = 0; arrayIndex < batchedCsvRows.length; arrayIndex++) {
        let csvRow = batchedCsvRows[arrayIndex],
          redemptionProductName = csvRow.redemption_product.toLowerCase(),
          countryIsoCode = csvRow.country_iso_code,
          insertValueArray = [];

        if (
          !oThis.redemptionProductNameToIdMap[redemptionProductName] ||
          !oThis.countryIsoCodeToCountryIdMap[countryIsoCode]
        ) {
          console.log('\nData not found for current csvRow: ', csvRow);
          unableToInsertCsvRows.push(csvRow);
          continue;
        }

        const productId = oThis.redemptionProductNameToIdMap[redemptionProductName],
          countryId = oThis.countryIsoCodeToCountryIdMap[countryIsoCode];

        // Check if entry already present in table.
        const fetchDetailsResponse = await new RedemptionProductCountryModel().fetchDetailsByProductIdAndCountryId(
          productId,
          countryId
        );

        if (!CommonValidators.validateNonEmptyObject(fetchDetailsResponse.data)) {
          insertValueArray[0] = productId; // redemption_product_id
          insertValueArray[1] = countryId; // country_id
          insertValueArray[2] = csvRow.options; // redemption_options

          insertMultipleValues.push(insertValueArray);
        } else {
          logger.warn(
            `Entry already present in table for productId: ${productId} and countryId: ${countryId}. So skipping this.`
          );
        }
      }

      if (insertMultipleValues.length > 0) {
        await new RedemptionProductCountryModel().insertMultiple(insertColumns, insertMultipleValues).fire();
      }
    }

    console.log('\n\n\nunable to insert following CsvRows========>\n', unableToInsertCsvRows);
  }
}

new PopulateRedemptionProductCountries({})
  .perform()
  .then(function() {
    process.exit(0);
  })
  .catch(function(err) {
    logger.log(err);
    process.exit(1);
  });
