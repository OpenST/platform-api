'use strict';

/**
 * Module to add price oracle to pricer rule for existing clients
 *
 * @module executables/oneTimers/multipleQuoteCurrencies/addPriceOracleToPriceRuleForExistingClients
 */

const rootPrefix = '../../..',
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  ClientConfigGroup = require(rootPrefix + '/app/models/mysql/ClientConfigGroup'),
  tokenConstants = require(rootPrefix + '/lib/globalConstant/token'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants');

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const auxChainId = process.argv[2],
  quoteCurrency = process.argv[3],
  clientIds = process.argv[4];

require(rootPrefix + '/lib/setup/economy/AddPriceOracleToPricerRule');

class AddPriceOracleToPricerRuleForExistingClients {
  constructor() {
    const oThis = this;

    oThis.clientIds = clientIds || '[]';
    oThis.clientData = [];
    oThis.clientsSkipped = [];

    oThis.clientIds = JSON.parse(oThis.clientIds);
  }

  /**
   * Perform
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._fetchConfig();

    await oThis._fetchClientIdsFromConfigGroups();

    await oThis._fetchDeployingClients();

    await oThis._fetchClientData();

    await oThis._addPriceOracleToPriceRule();

    return responseHelper.successWithData({
      clientsSkipped: oThis.clientsSkipped
    });
  }

  /**
   * Fetch config strategy
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchConfig() {
    const oThis = this;

    let configMap = await chainConfigProvider.getFor([auxChainId]);

    let configStrategy = configMap[auxChainId];

    oThis.ic = new InstanceComposer(configStrategy);
  }

  /**
   * Fetch client ids from config groups
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchClientIdsFromConfigGroups() {
    const oThis = this;

    if (oThis.clientIds.length > 0) return;

    let clientConfigGroup = new ClientConfigGroup({});

    let Rows = await clientConfigGroup
      .select('client_id')
      .where({
        chain_id: auxChainId
      })
      .fire();

    oThis.clientIds = [];

    for (let i = 0; i < Rows.length; i++) {
      oThis.clientIds.push(Rows[i].client_id);
    }
  }

  /**
   * Fetch clients which are in deploying status
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchDeployingClients() {
    const oThis = this;

    if (oThis.clientIds.length === 0) return;

    let rows = await new TokenModel({})
      .select('id, client_id')
      .where({
        status: tokenConstants.invertedStatuses[tokenConstants.deploymentStarted]
      })
      .where(['client_id in (?)', oThis.clientIds])
      .fire();

    oThis.clientsSkipped = [];

    for (let i = 0; i < rows.length; i++) {
      oThis.clientsSkipped.push(rows[i].client_id);
    }
    logger.log('====Skipping for clients====', oThis.clientsSkipped);
  }

  /**
   * Fetch client data
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchClientData() {
    const oThis = this;

    if (oThis.clientIds.length === 0) return;

    let rows = await new TokenModel({})
      .select('id, client_id')
      .where({
        status: tokenConstants.invertedStatuses[tokenConstants.deploymentCompleted]
      })
      .where(['client_id in (?)', oThis.clientIds])
      .fire();

    oThis.clientData = [];

    logger.info('==== Performing Add price oracle for clients=====');
    logger.info('===All Clients==', oThis.clientIds);

    for (let i = 0; i < rows.length; i++) {
      oThis.clientData.push({
        tokenId: rows[i].id,
        clientId: rows[i].client_id
      });
    }
  }

  /**
   * Add price oracle to pricer rule
   *
   * @return {Promise<void>}
   * @private
   */
  async _addPriceOracleToPriceRule() {
    const oThis = this;

    if (oThis.clientIds.length === 0) return;

    let AddPriceOracleToPricerRule = oThis.ic.getShadowedClassFor(
      coreConstants.icNameSpace,
      'AddPriceOracleToPricerRule'
    );

    let promiseArray = [];

    for (let i = 0; i < oThis.clientData.length; i++) {
      let addPriceOracleToPricerRule = new AddPriceOracleToPricerRule({
        tokenId: oThis.clientData[i].tokenId,
        clientId: oThis.clientData[i].clientId,
        auxChainId: auxChainId,
        quoteCurrency: quoteCurrency,
        waitTillReceipt: 1
      });

      promiseArray.push(addPriceOracleToPricerRule.perform());

      if (i % 10 == 0) {
        await Promise.all(promiseArray);
        promiseArray = [];
      }
    }

    if (promiseArray.length > 0) {
      await Promise.all(promiseArray);
    }
  }
}

let addPriceOracleToPricerRuleForExistingClients = new AddPriceOracleToPricerRuleForExistingClients();

addPriceOracleToPricerRuleForExistingClients
  .perform()
  .then(function(resp) {
    console.log(resp);
    process.exit(0);
  })
  .catch(function(err) {
    console.log(err);
    process.exit(1);
  });
