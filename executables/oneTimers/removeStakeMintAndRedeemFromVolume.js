const BigNumber = require('bignumber.js');

const rootPrefix = '../..',
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  WorkflowModel = require(rootPrefix + '/app/models/mysql/Workflow'),
  TokenAddressesModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress');

// Declare variables.
const btStakeAndMintInvertedKind = 4;
const btRedeemAndUnstakeInvertedKind = 19;
const conversionFactor = '1000000000000000000';

class RemoveStakeMintAndRedeemFromVolume {
  async perform() {
    const oThis = this;

    await oThis.fetchRelevantWorkflows();

    oThis.createTokenIdMapping();

    await oThis.fetchConversionFactor();

    await oThis.fetchUbtAddress();

    await oThis._getEconomyDetailsFromDdb();

    await oThis._updateVolumes();
  }

  /**
   * Fetch successful btStakeAndMintKind and btRedeemAndUnstakeKind workflows.
   *
   * @return {Promise<void>}
   */
  async fetchRelevantWorkflows() {
    const oThis = this;

    oThis.relevantWorkflows = await new WorkflowModel()
      .select('*')
      .where([
        'kind IN (?) AND status = (?)',
        [btStakeAndMintInvertedKind, btRedeemAndUnstakeInvertedKind],
        new WorkflowModel().invertedStatuses[workflowConstants.completedStatus]
      ])
      .fire();
  }

  /**
   * Create tokenIdMapping.
   */
  createTokenIdMapping() {
    const oThis = this;
    oThis.tokenIdMapping = {};

    for (let index = 0; index < oThis.relevantWorkflows.length; index++) {
      const workflow = oThis.relevantWorkflows[index];
      const requestParams = JSON.parse(workflow.request_params);
      const responseData = JSON.parse(workflow.response_data);
      const workflowKind = workflow.kind;
      oThis.tokenIdMapping[requestParams.tokenId] = oThis.tokenIdMapping[requestParams.tokenId] || {
        chainId: requestParams.auxChainId,
        amount: new BigNumber(0)
      };

      oThis.tokenIdMapping[requestParams.tokenId].amount =
        workflowKind == btStakeAndMintInvertedKind
          ? oThis.tokenIdMapping[requestParams.tokenId].amount.plus(new BigNumber(responseData.amountMinted))
          : oThis.tokenIdMapping[requestParams.tokenId].amount.plus(new BigNumber(requestParams.amountToRedeem));
    }
  }

  /**
   * Fetch conversion factor of economy.
   *
   * @return {Promise<void>}
   */
  async fetchConversionFactor() {
    const oThis = this;

    const tokenIds = Object.keys(oThis.tokenIdMapping);

    const conversionFactors = await new TokenModel()
      .select('*')
      .where(['id IN (?)', tokenIds])
      .fire();

    for (let index = 0; index < conversionFactors.length; index++) {
      const conversionFactorEntity = conversionFactors[index];
      oThis.tokenIdMapping[conversionFactorEntity.id].conversionFactor = conversionFactorEntity.conversion_factor;
    }
  }

  /**
   * Fetch UBT addresses for tokenIds.
   *
   * @return {Promise<void>}
   */
  async fetchUbtAddress() {
    const oThis = this;

    const tokenIds = Object.keys(oThis.tokenIdMapping);

    const ubtAddresses = await new TokenAddressesModel()
      .select('*')
      .where([
        'token_id IN (?) AND kind = (?)',
        tokenIds,
        new TokenAddressesModel().invertedKinds[tokenAddressConstants.utilityBrandedTokenContract]
      ])
      .fire();

    for (let index = 0; index < ubtAddresses.length; index++) {
      const ubtEntity = ubtAddresses[index];
      oThis.tokenIdMapping[ubtEntity.token_id].ubtAddress = ubtEntity.address;
    }
  }

  /**
   * Get economy details for given token id.
   *
   * @return {Promise<*|result>}
   */
  async _getEconomyDetailsFromDdb() {
    const oThis = this;

    oThis.chainIdToUbtMapping = {};

    for (const tokenId in oThis.tokenIdMapping) {
      const entity = oThis.tokenIdMapping[tokenId];
      oThis.chainIdToUbtMapping[entity.chainId] = oThis.chainIdToUbtMapping[entity.chainId] || [];
      oThis.chainIdToUbtMapping[entity.chainId].push(entity.ubtAddress);
    }

    for (const chainId in oThis.chainIdToUbtMapping) {
      const blockScannerObj = await blockScannerProvider.getInstance([chainId]),
        EconomyCache = blockScannerObj.cache.Economy,
        economyCache = new EconomyCache({
          chainId: chainId,
          economyContractAddresses: oThis.chainIdToUbtMapping[chainId]
        });

      const cacheResponse = await economyCache.fetch();

      for (const tokenId in oThis.tokenIdMapping) {
        const tokenEntity = oThis.tokenIdMapping[tokenId];

        if (tokenEntity.chainId != chainId) {
          continue;
        }

        if (!cacheResponse.data[tokenEntity.ubtAddress]) {
          console.log('==========Error==========', tokenEntity);
          continue;
        }

        // Current volume in OST.
        oThis.tokenIdMapping[tokenId].currentVolume = cacheResponse.data[tokenEntity.ubtAddress].totalVolume;

        // Volume to be subtracted in BT.
        oThis.tokenIdMapping[tokenId].amount = oThis.tokenIdMapping[tokenId].amount.div(
          new BigNumber(conversionFactor)
        );
        // Volume to be subtracted in OST.
        oThis.tokenIdMapping[tokenId].amount = oThis.tokenIdMapping[tokenId].amount.div(
          new BigNumber(oThis.tokenIdMapping[tokenId].conversionFactor)
        );

        // 5 digits after decimal.
        oThis.tokenIdMapping[tokenId].amount = oThis.tokenIdMapping[tokenId].amount.toFixed(5);

        oThis.tokenIdMapping[tokenId].finalVolume = new BigNumber(oThis.tokenIdMapping[tokenId].currentVolume).minus(
          oThis.tokenIdMapping[tokenId].amount
        );

        if (oThis.tokenIdMapping[tokenId].finalVolume.lt(new BigNumber(0))) {
          console.log('Error for this token entity. ', tokenEntity);
        }
      }

      console.log('===oThis.tokenIdMapping====', JSON.stringify(oThis.tokenIdMapping));
      console.log('===oThis.chainIdToUbtMapping====', JSON.stringify(oThis.chainIdToUbtMapping));
    }
  }

  /**
   * Update volume of economies.
   *
   * @return {Promise<void>}
   * @private
   */
  async _updateVolumes() {
    const oThis = this;
    const promises = [];

    // Get all ubtAddresses for chainId.
    for (const chainId in oThis.chainIdToUbtMapping) {
      const blockScannerObj = await blockScannerProvider.getInstance([chainId]),
        EconomyModel = blockScannerObj.model.Economy,
        economyModelObject = new EconomyModel({
          consistentRead: '0'
        });

      // Loop over all ubtAddresses.
      for (let index = 0; index < oThis.chainIdToUbtMapping[chainId].length; index++) {
        const economyAddr = oThis.chainIdToUbtMapping[chainId][index];

        for (let tokenId in oThis.tokenIdMapping) {
          const tokenEntity = oThis.tokenIdMapping[tokenId];

          if (tokenEntity.ubtAddress === economyAddr) {
            if (tokenEntity.finalVolume.lt(new BigNumber(0))) {
              console.log('Error for this token entity. ', tokenEntity);
              tokenEntity.finalVolume = new BigNumber(0);
              console.log('Error for this token entity. 123', tokenEntity);
            }
            const updateParams = {
              TableName: economyModelObject.tableName(),
              Key: economyModelObject._keyObj({ contractAddress: economyAddr, chainId: chainId }),
              UpdateExpression: 'Set #totalVolume = :finalVolume, #updatedTimestamp = :updatedTimestamp',
              ExpressionAttributeNames: {
                '#totalVolume': economyModelObject.shortNameFor('totalVolume'),
                '#updatedTimestamp': economyModelObject.shortNameFor('updatedTimestamp')
              },
              ExpressionAttributeValues: {
                ':finalVolume': { N: tokenEntity.finalVolume.toFixed(5).toString(10) },
                ':updatedTimestamp': { N: Math.floor(new Date().getTime() / 1000).toString() }
              },
              ReturnValues: 'NONE'
            };

            console.log('===updateParams=====', updateParams);

            promises.push(economyModelObject.ddbServiceObj.updateItem(updateParams));
          }
        }
        await Promise.all(promises);

        const blockScannerObj = await blockScannerProvider.getInstance([chainId]),
          EconomyCache = blockScannerObj.cache.Economy,
          economyCache = new EconomyCache({
            chainId: chainId,
            economyContractAddresses: oThis.chainIdToUbtMapping[chainId]
          });

        await economyCache.clear();
      }
    }
  }
}

new RemoveStakeMintAndRedeemFromVolume()
  .perform()
  .then(() => {
    console.log('Cron finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.log(`Error: ${err}`);
    process.exit(1);
  });
