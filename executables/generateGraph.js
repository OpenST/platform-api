/**
 * This script will fetch data for all the token ids present in a chain and upload the data in s3.

 * Usage: node executables/generateGraph.js --cronProcessId 31
 *
 * @module executables/generateGraph
 *
 * This cron expects auxChainId.
 */

const program = require('commander');

const rootPrefix = '..',
  S3Upload = require(rootPrefix + '/lib/s3/UploadBody'),
  CronBase = require(rootPrefix + '/executables/CronBase'),
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  ErrorLogsConstants = require(rootPrefix + '/lib/globalConstant/errorLogs'),
  ClientConfigGroup = require(rootPrefix + '/app/models/mysql/ClientConfigGroup'),
  TotalTransactionsGraph = require(rootPrefix + '/lib/analytics/graph/TotalTransactions'),
  TransactionsByNameGraph = require(rootPrefix + '/lib/analytics/graph/TransactionsByName'),
  TransactionsByTypeGraph = require(rootPrefix + '/lib/analytics/graph/TransactionsByType'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  tokenConstants = require(rootPrefix + '/lib/globalConstant/token'),
  createErrorLogsEntry = require(rootPrefix + '/lib/errorLogs/createEntry'),
  graphConstants = require(rootPrefix + '/lib/globalConstant/graphConstants'),
  cronProcessesConstants = require(rootPrefix + '/lib/globalConstant/cronProcesses');

const BATCH_SIZE = 5;

program.option('--cronProcessId <cronProcessId>', 'Cron table process ID').parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log('    node executables/generateGraph.js --cronProcessId 31');
  logger.log('');
  logger.log('');
});

if (!program.cronProcessId) {
  program.help();
  process.exit(1);
}

/**
 * Class to fetch analytics data of a token to generate graphs
 *
 * @class GenerateGraph
 */
class GenerateGraph extends CronBase {
  /**
   * Constructor to fetch analytics data of a token to generate graphs
   *
   * @param {Object} params
   * @param {Number} params.cronProcessId
   *
   * @augments CronBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.canExit = true;
  }

  /**
   * Cron kind.
   *
   * @return {String}
   * @private
   */
  get _cronKind() {
    return cronProcessesConstants.generateGraph;
  }

  /**
   * Validate and sanitize.
   *
   * @return {Promise<*>}
   * @private
   */
  async _validateAndSanitize() {
    const oThis = this;

    if (!oThis.auxChainId) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'e_gg_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { auxChainId: oThis.auxChainId }
        })
      );
    }
  }

  /**
   * Pending tasks done.
   *
   * @return {boolean}
   * @private
   */
  _pendingTasksDone() {
    const oThis = this;

    return oThis.canExit;
  }

  /**
   * Start the cron.
   * NOTE: Let oThis.canExit be always true. As it's just a read only cron and not that important.
   *
   * @return {Promise<void>}
   * @private
   */
  async _start() {
    const oThis = this;

    let iterationNumber = 1;

    while (true) {
      logger.step('Fetching all token ids for chain id: ', oThis.auxChainId, ' iteration number:', iterationNumber);

      const tokenIds = await oThis._fetchActiveTokenIds(),
        totalTokenIds = tokenIds.length;
      let promiseArray = [];

      logger.log('Token Ids: ', tokenIds);

      for (let index = 0; index < totalTokenIds; index++) {
        logger.log('Processing token id: ', tokenIds[index]);
        promiseArray.push(oThis._performPerTokenOperation(tokenIds[index]));

        if (promiseArray.length >= BATCH_SIZE || totalTokenIds === index + 1) {
          await Promise.all(promiseArray);
          promiseArray = [];
        }
      }

      await basicHelper.sleep(1000 * 60);
      iterationNumber++;
    }
  }

  /**
   * This function fetches active token ids.
   *
   * @returns {Promise<Array>}
   * @private
   */
  async _fetchActiveTokenIds() {
    const oThis = this;

    const clientIds = await oThis._fetchClientsOnChain(oThis.auxChainId);

    if (clientIds.length === 0) {
      logger.warn('No client ids are present for given chainId: ', oThis.auxChainId);

      return [];
    }

    const tokenIds = await oThis._fetchClientTokenIdsFor(clientIds);

    if (tokenIds.length === 0) {
      logger.warn('No active token ids present for given chainId: ', oThis.auxChainId);

      return [];
    }

    return tokenIds;
  }

  /**
   * Fetch all client ids on specific chain.
   *
   * @param {number} auxChainId
   *
   * @return {Promise<Array>}
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
   * @param {array} clientIds
   *
   * @return {Promise<Array>}
   * @private
   */
  async _fetchClientTokenIdsFor(clientIds) {
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
   * Performs all operations which are to be done for one tokenId.
   *
   * @param {number} tokenId
   *
   * @returns {Promise<void>}
   * @private
   */
  async _performPerTokenOperation(tokenId) {
    const oThis = this,
      currentTimestamp = Date.now();

    for (let index = 0; index < graphConstants.allDurationTypes.length; index++) {
      const durationType = graphConstants.allDurationTypes[index];

      logger.step('Preparing TotalTransactions graph for token id: ', tokenId, ' duration:', durationType);
      await oThis._fetchAndUploadTotalTransactionsGraphData(tokenId, durationType, currentTimestamp);

      logger.step('Preparing TransactionsTypes graph for token id: ', tokenId, ' duration:', durationType);
      await oThis._fetchAndUploadTransactionsByTypeGraphData(tokenId, durationType, currentTimestamp);

      logger.step('Preparing TransactionsNames graph for token id: ', tokenId, ' duration:', durationType);
      await oThis._fetchAndUploadTransactionsByNameGraphData(tokenId, durationType, currentTimestamp);
    }
  }

  /**
   * Fetches graph data for number of transactions graph and uploads to S3.
   *
   * @param {number} tokenId
   * @param {string} durationType
   * @param {number} currentTimestamp
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchAndUploadTotalTransactionsGraphData(tokenId, durationType, currentTimestamp) {
    const oThis = this,
      params = {
        auxChainId: oThis.auxChainId,
        tokenId: tokenId,
        durationType: durationType,
        currentTimestamp: currentTimestamp
      };

    const totalTransactionsGraphObj = new TotalTransactionsGraph(params),
      responseData = await totalTransactionsGraphObj.perform();

    logger.info('TotalTransactions data fetch status for token id: ', tokenId, ' status:', responseData.isSuccess());

    if (responseData.isSuccess()) {
      const s3FilePath =
        coreConstants.S3_ANALYTICS_GRAPH_FOLDER + '/' + tokenId + '/total-transactions-by-' + durationType + '.json';
      await oThis.uploadOnS3(s3FilePath, responseData);
    } else {
      await createErrorLogsEntry.perform(responseData, ErrorLogsConstants.highSeverity);
    }
  }

  /**
   * Fetches graph data for transactions by type graph and uploads to S3.
   *
   * @param {number} tokenId
   * @param {string} durationType
   * @param {number} currentTimestamp
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchAndUploadTransactionsByTypeGraphData(tokenId, durationType, currentTimestamp) {
    const oThis = this,
      params = {
        auxChainId: oThis.auxChainId,
        tokenId: tokenId,
        durationType: durationType,
        currentTimestamp: currentTimestamp
      };

    const transactionByTypeGraphObj = new TransactionsByTypeGraph(params),
      responseData = await transactionByTypeGraphObj.perform();

    logger.info('TransactionsByType data fetch status for token id: ', tokenId, ' status:', responseData.isSuccess());

    if (responseData.isSuccess()) {
      const s3FilePath =
        coreConstants.S3_ANALYTICS_GRAPH_FOLDER + '/' + tokenId + '/transactions-by-type-by-' + durationType + '.json';
      await oThis.uploadOnS3(s3FilePath, responseData);
    } else {
      await createErrorLogsEntry.perform(responseData, ErrorLogsConstants.highSeverity);
    }
  }

  /**
   * Fetches graph data for transactions by name graph and uploads to S3.
   *
   * @param {number} tokenId
   * @param {string} durationType
   * @param {number} currentTimestamp
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchAndUploadTransactionsByNameGraphData(tokenId, durationType, currentTimestamp) {
    const oThis = this,
      params = {
        auxChainId: oThis.auxChainId,
        tokenId: tokenId,
        durationType: durationType,
        currentTimestamp: currentTimestamp
      };

    const transactionByNameGraphObj = new TransactionsByNameGraph(params),
      responseData = await transactionByNameGraphObj.perform();

    logger.info('TransactionsByName data fetch status for token id: ', tokenId, ' status:', responseData.isSuccess());

    if (responseData.isSuccess()) {
      const s3FilePath =
        coreConstants.S3_ANALYTICS_GRAPH_FOLDER + '/' + tokenId + '/transactions-by-name-by-' + durationType + '.json';
      await oThis.uploadOnS3(s3FilePath, responseData);
    } else {
      await createErrorLogsEntry.perform(responseData, ErrorLogsConstants.highSeverity);
    }
  }

  /**
   * Function which uploads data to S3.
   *
   * @param {string} filePath
   * @param {object} body
   *
   * @returns {Promise<void>}
   */
  async uploadOnS3(filePath, body) {
    const paramsForS3Upload = {
        bucket: coreConstants.S3_ANALYTICS_BUCKET,
        filePath: filePath,
        body: JSON.stringify(body.toHash()),
        contentType: 'application/json'
      },
      s3UploadObj = new S3Upload(paramsForS3Upload);

    logger.info('File upload started for: ', filePath);
    await s3UploadObj
      .perform()
      .then(function(rsp) {
        logger.info('File upload successful. ', rsp);
      })
      .catch(function(err) {
        logger.error('File upload failed. Reason: ', err);
        // Alert
      });
  }
}

logger.step('Generation graph process started.');

// Perform action
new GenerateGraph({ cronProcessId: +program.cronProcessId }).perform();

setInterval(function() {
  logger.info('Ending the process. Sending SIGINT.');
  process.emit('SIGINT');
}, cronProcessesConstants.continuousCronRestartInterval);
