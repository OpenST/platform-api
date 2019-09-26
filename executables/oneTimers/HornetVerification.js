const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  blockScannerProvider = require(rootPrefix + '/lib/providers/blockScanner'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  ConfigStrategyByChainId = require(rootPrefix + '/helpers/configStrategy/ByChainId.js');

require(rootPrefix + '/lib/cacheManagement/chain/UserSessionAddress');

const tokenId = '1185',
  clientId = '10267',
  companyUUUID = '0d91bb6f-7301-4bb8-8cf0-655e16de4f84',
  chainId = '197',
  conversionFactor = 10,
  startDate = new Date('2019, 06, 01'),
  endDate = new Date('2019, 07, 01');

let totalTokenTransfers = 0,
  totalVolume = 0;

class HornetVerification {
  perform() {
    const oThis = this;

    return oThis.asyncPerform();
  }

  async asyncPerform() {
    const oThis = this;

    oThis.blockScannerObj = await blockScannerProvider.getInstance([chainId]);

    await oThis.fetchConfigStrategy();

    await oThis.fetchCompanySessionAddress();

    await oThis.getTransactionHashes();
  }

  async fetchConfigStrategy() {
    const oThis = this;

    oThis.configStrategy = (await new ConfigStrategyByChainId(chainId).getComplete()).data;
    oThis.ic = new InstanceComposer(oThis.configStrategy);
  }

  async fetchCompanySessionAddress() {
    const oThis = this;

    const UserSessionAddressCache = oThis.ic.getShadowedClassFor(coreConstants.icNameSpace, 'UserSessionAddressCache'),
      userSessionAddressCache = new UserSessionAddressCache({
        userId: companyUUUID,
        tokenId: tokenId
      }),
      userSessionAddressCacheResp = await userSessionAddressCache.fetch();
    if (userSessionAddressCacheResp.isFailure() || !userSessionAddressCacheResp.data) {
      return Promise.reject(userSessionAddressCacheResp);
    }

    oThis.sessionAddresses = userSessionAddressCacheResp.data.addresses;
  }

  async getTransactionHashes() {
    const oThis = this;

    const limit = 10;

    let page = 1,
      offset = null,
      moreDataPresent = true;

    while (moreDataPresent) {
      offset = (page - 1) * limit;

      const whereClause = [
        'token_id = ? AND status = ? AND receipt_status = ? AND session_address NOT IN (?) AND created_at >= ? AND created_at < ?',
        tokenId,
        6,
        1,
        oThis.sessionAddresses,
        startDate,
        endDate
      ];

      const dbRows = await new TransactionMetaModel()
        .select('transaction_hash')
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .fire();

      if (dbRows.length === 0) {
        moreDataPresent = false;
      } else {
        let transactionHashes = [];
        for (let i = 0; i < dbRows.length; i++) {
          transactionHashes.push(dbRows[i].transaction_hash);
        }
        console.log('transactionHashes---', transactionHashes);
        //await oThis._fetchTransactionDetails(transactionHashes);
      }
      page++;
    }

    console.log('totalTokenTransfers--------', totalTokenTransfers);
  }

  async _fetchTransactionDetails(transactionHashes) {
    const oThis = this,
      promiseArray = [];

    const GetTransactionDetails = oThis.blockScannerObj.transaction.Get;

    while (transactionHashes.length) {
      const currentTransactionHashes = transactionHashes.splice(0, 100);

      const getTransactionDetails = new GetTransactionDetails(chainId, currentTransactionHashes);

      promiseArray.push(
        getTransactionDetails.perform().catch(function() {
          console.error('Error in get transaction service.');
        })
      );
    }

    const promiseArrayResponse = await Promise.all(promiseArray);

    let transactionTransfersMap = await oThis._getTransferDetails(transactionHashes);

    console.log('------transactionTransfersMap----', transactionTransfersMap);

    for (let index = 0; index < promiseArrayResponse.length; index++) {
      const transactionGetResponse = promiseArrayResponse[index],
        transactionDetails = transactionGetResponse.data;

      for (let i = 0; i < transactionHashes.length; i++) {
        let transactionHash = transactionHashes[i];

        if (transactionDetails[transactionHash] && transactionDetails[transactionHash].transactionStatus === '1') {
          console.log('transactionDetails----', transactionDetails[transactionHash].transfers);
          totalTokenTransfers = totalTokenTransfers + Number(transactionDetails[transactionHash].totalTokenTransfers);
        }

        let transferEventsMap = transactionTransfersMap[transactionHash];
        let amountInOneTx = basicHelper.convertToBigNumber(0);
        for (let eventIndex in transferEventsMap) {
          let transferEvent = transferEventsMap[eventIndex],
            currentAmount = basicHelper.convertToBigNumber(transferEvent.amount);
          amountInOneTx = amountInOneTx.add(currentAmount);
        }
        totalVolume = basicHelper
          .convertToNormalForPower(amountInOneTx, 18)
          .div(basicHelper.convertToBigNumber(conversionFactor))
          .toFixed(5);
      }
    }
  }

  async _getTransferDetails(transactionHashes) {
    const oThis = this;

    let GetTransfer = oThis.blockScannerObj.transfer.GetAll,
      getTransfer = new GetTransfer(chainId, transactionHashes),
      getTransferResp = await getTransfer.perform();

    if (getTransferResp.isFailure()) {
      return Promise.reject(getTransferResp);
    }

    return getTransferResp.data;
  }
}

module.exports = HornetVerification;
