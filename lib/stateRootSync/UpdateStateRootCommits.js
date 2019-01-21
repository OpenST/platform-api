'use strict';

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  GetTransactionDetails = require(rootPrefix + '/lib/transactions/GetDetailsFromDDB'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  stateRootCommitHistoryConstants = require(rootPrefix + '/lib/globalConstant/stateRootCommit'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  StateRootCommitModel = require(rootPrefix + '/app/models/mysql/StateRootCommit');

class UpdateStateRootCommit {
  constructor(params) {
    const oThis = this;

    oThis.sourceChainId = params.sourceChainId;
    oThis.destinationChainId = params.destinationChainId;
    oThis.transactionHash = params.transactionHash;
    oThis.blockNumber = params.blockNumber;
  }

  /**
   * Perform
   *
   * @return {Promise<result>}
   */
  perform() {
    const oThis = this;

    return oThis._asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error(`${__filename}::perform::catch`);
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 'l_srs_usrc_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /***
   * Async performer for the class.
   *
   * @private
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._getTransactionStatus();

    if (!oThis.blockNumber) {
      await oThis._getDestinationAddressKinds();

      await oThis._fetchAnchor();

      await oThis._fetchOrganization();

      await oThis._getBlockNumber();
    }

    let response = await oThis._insertInStateRootCommits();

    if (response.affectedRows == 1) {
      return responseHelper.successWithData({ taskDone: 1 });
    } else {
      return responseHelper.successWithData({ taskDone: 0 });
    }
  }

  /**
   * _getTransactionStatus
   *
   * @return {Promise<void>}
   * @private
   */
  async _getTransactionStatus() {
    const oThis = this;

    let getTransactionDetails = new GetTransactionDetails({
      chainId: oThis.destinationChainId,
      transactionHashes: [oThis.transactionHash]
    });

    let response = await getTransactionDetails.perform();

    let checkTxStatus = new CheckTxStatus({
      ddbTransaction: response.data[oThis.transactionHash]
    });

    let checkStatusResponse = await checkTxStatus.perform();

    oThis.status =
      checkStatusResponse.data == 1 ? stateRootCommitHistoryConstants.commited : stateRootCommitHistoryConstants.failed;
  }

  /**
   * _getDestinationAddressKinds
   *
   * @return {Promise<void>}
   * @private
   */
  async _getDestinationAddressKinds() {
    const oThis = this;

    oThis.sourceWeb3 = await oThis._getWeb3(oThis.sourceChainId);
    oThis.destinationWeb3 = await oThis._getWeb3(oThis.destinationChainId);

    oThis.organizationKind =
      oThis.fromOriginToAux == 1
        ? chainAddressConstants.auxOrganizationContract
        : chainAddressConstants.originOrganizationContract;

    oThis.anchorKind =
      oThis.fromOriginToAux == 1
        ? chainAddressConstants.auxAnchorContractKind
        : chainAddressConstants.originAnchorContractKind;
  }

  /**
   * _getWeb3
   *
   * @param chainId
   * @return {Promise<void>}
   * @private
   */
  async _getWeb3(chainId) {
    const oThis = this;

    let response = await chainConfigProvider.getFor([chainId]);

    oThis.chainConfig = response[chainId];

    if (chainId == oThis.destinationChainId) {
      oThis.destinationChainType = oThis.chainConfig.hasOwnProperty('originGeth') ? 'origin' : 'aux';
    }

    oThis.wsProviders = oThis.chainConfig.hasOwnProperty('originGeth')
      ? oThis.chainConfig.originGeth.readWrite.wsProviders
      : oThis.chainConfig.auxGeth.readWrite.wsProviders;

    return web3Provider.getInstance(oThis.wsProviders[0]).web3WsProvider;
  }

  /**
   * _getBlockNumber
   *
   * @return {Promise<void>}
   * @private
   */
  async _getBlockNumber() {
    const oThis = this;

    let oAnchor = new MosaicAnchor.Anchor(
      oThis.sourceWeb3,
      oThis.destinationWeb3,
      oThis.anchorContract,
      oThis.organizationContract
    );

    oThis.blockNumber = await oAnchor.getLatestStateRootBlockHeight();
  }

  /**
   * _fetchAnchor
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchAnchor() {
    const oThis = this;

    let auxChainId = oThis.destinationChainType == 'aux' ? oThis.destinationChainId : oThis.sourceChainId;

    let resp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.destinationChainId,
      auxChainId: auxChainId,
      kind: oThis.anchorKind
    });

    if (resp.isSuccess()) {
      oThis.anchorContract = resp.data.address;
    }
  }

  /**
   * _fetchOrganization
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchOrganization() {
    const oThis = this;

    let auxChainId = oThis.destinationChainType == 'aux' ? oThis.destinationChainId : oThis.sourceChainId;

    let resp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.destinationChainId,
      auxChainId: auxChainId,
      kind: oThis.organizationKind
    });

    if (resp.isSuccess()) {
      oThis.organizationContract = resp.data.address;
    }
  }

  /**
   * updateStateRootCommits
   *
   * @return {*}
   */
  _insertInStateRootCommits() {
    const oThis = this;

    let stateRootCommitModel = new StateRootCommitModel();

    return stateRootCommitModel.insertStateRootCommit({
      source_chain_id: oThis.sourceChainId,
      target_chain_id: oThis.destinationChainId,
      block_number: oThis.blockNumber,
      status: stateRootCommitModel.invertedStatuses[oThis.status]
    });
  }
}

module.exports = UpdateStateRootCommit;
