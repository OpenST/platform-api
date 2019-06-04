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
  coreConstants = require(rootPrefix + '/config/coreConstants');

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const auxChainId = process.argv[2],
  quoteCurrency = process.argv[3];

require(rootPrefix + '/lib/setup/economy/AddPriceOracleToPricerRule');

class AddPriceOracleToPricerRuleForExistingClients {
  constructor() {}

  /**
   * Perform
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._fetchConfig();

    await oThis._fetchClientIdsFromConfigGroups();

    await oThis._fetchClientData();

    await oThis._addPriceOracleToPriceRule();
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
   * Fetch client data
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchClientData() {
    const oThis = this;

    let tokenModel = new TokenModel({});

    let Rows = tokenModel
      .select('id, client_id')
      .where({
        status: tokenConstants.invertedStatuses[tokenConstants.deploymentCompleted]
      })
      .where(['client_id in (?)', oThis.clientIds])
      .fire();

    oThis.clientData = [];

    for (let i = 0; i < Rows.length; i++) {
      oThis.clientData.push({
        tokenId: Rows[i].id,
        clientId: Rows[i].client_id
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

      if (i % 100 == 0) {
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
  })
  .catch(function(err) {
    console.log(err);
  });
