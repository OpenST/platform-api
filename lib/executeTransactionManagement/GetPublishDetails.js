'use strict';

const rootPrefix = '../..',
  OSTBase = require('@ostdotcom/base'),
  BigNumber = require('bignumber.js'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  kwcConstants = require(rootPrefix + '/lib/globalConstant/kwc'),
  responseHelper = require(rootPrefix + '/lib/formatter/response');

const InstanceComposer = OSTBase.InstanceComposer;
require(rootPrefix + '/lib/cacheManagement/chain/TokenExTxProcess');

class ExTxGetPublishDetails {
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.tokenId;
    oThis.ephemeralAddress = params.ephemeralAddress;
  }

  async perform() {
    const oThis = this;

    let TokenExTxProcessCacheKlass = oThis.ic().getShadowedClassFor(coreConstants.icNameSpace, 'TokenExTxProcessCache');
    let exTxProcesses = await new TokenExTxProcessCacheKlass({ tokenId: oThis.tokenId }).fetch();
    let tokenExTxProcesses = exTxProcesses.data[oThis.tokenId];

    if (!tokenExTxProcesses || tokenExTxProcesses.length == 0) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_etm_gtntp_1',
          api_error_identifier: 'something_went_wrong',
          debug_options: { tokenId: oThis.tokenId, exTxProcesses: exTxProcesses }
        })
      );
    }

    let uniqBigNo = new BigNumber(oThis.ephemeralAddress).mod(tokenExTxProcesses.length),
      uniqWorkerNo = uniqBigNo.toNumber(),
      tokenExTxProcess = tokenExTxProcesses[uniqWorkerNo];

    tokenExTxProcess['topicName'] = kwcConstants.exTxTopicName(
      tokenExTxProcess.chainId,
      tokenExTxProcess.queueTopicSuffix
    );

    return tokenExTxProcess;
  }
}

InstanceComposer.registerAsShadowableClass(ExTxGetPublishDetails, coreConstants.icNameSpace, 'ExTxGetPublishDetails');

module.exports = ExTxGetPublishDetails;
