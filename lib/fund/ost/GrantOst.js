'use strict';
/**
 * This module grants eth to economy owner.
 *
 * @module lib/fund/ost/GrantOst
 */
const rootPrefix = '../../..',
  CoreAbis = require(rootPrefix + '/config/CoreAbis'),
  GrantOstBase = require(rootPrefix + '/lib/fund/ost/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  grantEthOstConstant = require(rootPrefix + '/lib/globalConstant/grant'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  environmentConst = require(rootPrefix + '/lib/globalConstant/environmentInfo'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  AddressPrivateKeyCache = require(rootPrefix + '/lib/sharedCacheManagement/AddressPrivateKey');

/**
 * Class for granting ost.
 *
 * @class
 */
class GrantOst extends GrantOstBase {
  /**
   * Constructor for granting ost.
   *
   * @param {Object} params
   * @param {Integer} params.clientId
   * @param {Integer} params.originChainId
   * @param {String} params.address
   *
   * @augments GrantOstBase
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.pendingTransactionExtraData = params['pendingTransactionExtraData'];
    oThis.clientId = params.clientId;
    oThis.ownerAddress = params.address;
    oThis.originChainId = params.originChainId;
    oThis.senderPrivateKey = null;
  }

  /**
   * Async perform
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _asyncPerform() {
    const oThis = this;

    oThis._validate();

    await oThis._setWeb3Instance();

    await oThis._fetchSenderPrivateKey();

    let fundResponse = await oThis._fundAddress();

    if (fundResponse.isSuccess() && fundResponse.data.transactionHash) {
      return Promise.resolve(
        responseHelper.successWithData({
          transactionHash: fundResponse.data.transactionHash,
          taskStatus: workflowStepConstants.taskPending,
          taskResponseData: fundResponse.data.txOptions
        })
      );
    } else {
      responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskDone
      });
    }
  }

  /**
   * Run some validations.
   *
   * @return {*}
   *
   * @private
   */
  _validate() {
    if (
      !(coreConstants.environment === environmentConst.environment.production) &&
      !(coreConstants.subEnvironment === environmentConst.subEnvironment.mainnet)
    )
      logger.info('Non production Sandbox environment');
    else {
      return responseHelper.error({
        internal_error_identifier: 'l_f_e_ge_1',
        api_error_identifier: 'something_went_wrong',
        debug_options: '',
        error_config: {}
      });
    }
  }

  /**
   * Fetch sender private key.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchSenderPrivateKey() {
    const oThis = this,
      granterAddressResponse = await new ChainAddressModel().fetchAddress({
        chainId: oThis.originChainId,
        kind: chainAddressConstants.granterKind
      });

    oThis.fromAddress = granterAddressResponse.data.addresses[0];

    let addressPrivateKeyCache = new AddressPrivateKeyCache({ address: oThis.fromAddress }),
      cacheFetchRsp = await addressPrivateKeyCache.fetchDecryptedData();

    oThis.senderPrivateKey = cacheFetchRsp.data['private_key_d'];
  }

  /**
   * Fund address
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _fundAddress() {
    const oThis = this;

    let simpleTokenContractAddressRsp = await new ChainAddressModel().fetchAddress({
        chainId: oThis.originChainId,
        kind: chainAddressConstants.baseContractKind
      }),
      simpleTokenContractAddress = simpleTokenContractAddressRsp.data.address,
      senderAddress = oThis.originWeb3.eth.accounts.privateKeyToAccount(oThis.senderPrivateKey).address;

    logger.debug('Fetched Address from private key-----', senderAddress);

    let simpleTokenAbi = CoreAbis.simpleToken,
      simpleTokenContractObj = new oThis.originWeb3.eth.Contract(simpleTokenAbi, simpleTokenContractAddress);

    let encodedABI = simpleTokenContractObj.methods
        .transfer(oThis.ownerAddress, grantEthOstConstant.grantOstValue.toString(10))
        .encodeABI(),
      ostTransferParams = {
        from: senderAddress,
        to: simpleTokenContractAddress,
        data: encodedABI,
        value: 0,
        gas: 60000
      };
    console.log('Balance  -----------  ', await simpleTokenContractObj.methods.balanceOf(senderAddress).call({}));

    let submitTxRsp = await new SubmitTransaction({
      chainId: oThis.originChainId,
      provider: oThis.originWsProviders[0],
      txOptions: ostTransferParams,
      options: oThis.pendingTransactionExtraData
    }).perform();

    submitTxRsp.data.txOptions = ostTransferParams;

    logger.debug('========= SubmitTxRsp from GrantOst ==========', submitTxRsp);

    logger.log('OST successfully funded to address ->', oThis.ownerAddress);

    //await oThis.originWeb3.eth.accounts.wallet.remove(oThis.senderPrivateKey);

    return submitTxRsp;
  }
}

module.exports = GrantOst;
