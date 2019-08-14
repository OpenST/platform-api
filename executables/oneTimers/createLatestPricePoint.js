/**
 * This script is used to create latest price points.
 *
 * @module executables/oneTimers/createLatestPricePoint
 */
const program = require('commander');

const rootPrefix = '../..',
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner');

program.option('--chainId <chainId>', 'Chain id').parse(process.argv);

program.on('--help', () => {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(' node executables/oneTimers/createLatestPricePoint.js --chainId 2000');
  logger.log('');
  logger.log('');
});

/**
 * Class for createLatestPricePoint.
 *
 * @class
 */
class createLatestPricePoint {
  /**
   * Constructor for initial setup
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.chainId = params.chainId;
  }

  /**
   * Main performer method for the class.
   *
   * @returns {Promise<void>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(err) {
      logger.error(`In catch block of ${__filename}`);
      return responseHelper.error({
        internal_error_identifier: 'e_ot_clpp',
        api_error_identifier: 'something_went_wrong',
        debug_options: { err: err.toString() }
      });
    });
  }

  /**
   * Async performer.
   *
   * @returns {Promise<void>}
   */
  async asyncPerform() {
    const oThis = this,
      blockScannerObj = await blockScannerProvider.getInstance([oThis.chainId]),
      LatestPricePoint = blockScannerObj.model.LatestPricePoint;

    // Create  LatestPricePoint table.
    await new LatestPricePoint({}).createTable();
  }
}

/**
 * This method performs certain validations on the input params.
 *
 */
const validateAndSanitize = function() {
  if (!program.chainId) {
    program.help();
    process.exit(1);
  }
};

validateAndSanitize();

let latestPricePointObj = new createLatestPricePoint(program);
latestPricePointObj
  .perform()
  .then(function() {
    logger.win('Table created.');
    process.exit(0);
  })
  .catch(function(err) {
    logger.error('Faced error: ', err);
    process.exit(1);
  });
