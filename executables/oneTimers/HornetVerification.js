const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  TransactionMetaModel = require(rootPrefix + '/app/models/mysql/TransactionMeta'),
  ConfigStrategyByChainId = require(rootPrefix + '/helpers/configStrategy/ByChainId.js');

require(rootPrefix + '/lib/cacheManagement/chain/UserSessionAddress');

const tokenId = '1185',
  clientId = '10267',
  companyUUUID = '0d91bb6f-7301-4bb8-8cf0-655e16de4f84',
  chainId = '197',
  startDate = new Date('2019, 06, 01'),
  endDate = new Date('2019, 07, 01');

class HornetVerification {
  perform() {
    const oThis = this;

    return oThis.asyncPerform();
  }

  async asyncPerform() {
    const oThis = this;

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
      .fire();

    console.log('====dbRows========', dbRows.length);
  }
}

module.exports = HornetVerification;
