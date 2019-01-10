'use strict';

/**
 * Deploy simpleToken
 *
 * @module tools/chainSetup/origin/simpleTokenPrime/Deploy
 */
const rootPrefix = '../../../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  SetupSTPrimeBase = require(rootPrefix + '/tools/chainSetup/aux/simpleTokenPrime/Base'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  chainSetupConstants = require(rootPrefix + '/lib/globalConstant/chainSetupLogs'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

/**
 *
 * @class
 */
class DeploySimpleTokenPrime extends SetupSTPrimeBase {
  /**
   * Constructor
   *
   * @param {Object} params
   *
   * @constructor
   */
  constructor(params) {
    super(params);
    const oThis = this;
    oThis.chainId = params.chainId;
  }

  /**
   * asyncPerform
   *
   * @ignore
   *
   * @return {Promise}
   */
  async _asyncPerform() {
    const oThis = this;

    let deployerAddress = await oThis._getDeployerAddr(),
      simpleTokenAddress = await oThis._getSimpleTokenContractAddr(),
      organizationAddress = await oThis._getSTPrimeOrgContractAddr(),
      deployerKey = await oThis._fetchPrivateKey(deployerAddress);

    oThis._addKeyToWallet(deployerKey);

    let nonceRsp = await oThis._fetchNonce(deployerAddress);

    let txOptions = {
      gasPrice: '0x0',
      from: deployerAddress,
      nonce: nonceRsp.data['nonce'],
      chainId: oThis.chainId
    };

    let helperObj = new SetupSTPrimeBase.STPrimeSetupHelper(oThis._web3Instance),
      deployerResponse = await helperObj
        .deploy(simpleTokenAddress, organizationAddress, txOptions)
        .then(function(txReceipt) {
          logger.debug('txReceipt', txReceipt);
          return responseHelper.successWithData({
            transactionReceipt: txReceipt,
            transactionHash: txReceipt.transactionHash,
            contractAddress: txReceipt.contractAddress
          });
        })
        .catch(function(errorResponse) {
          logger.error(errorResponse);
          return responseHelper.error({
            internal_error_identifier: 't_cos_so_1',
            api_error_identifier: 'unhandled_catch_response',
            debug_options: {}
          });
        });

    oThis._removeKeyFromWallet(deployerKey);

    deployerResponse.debugOptions = {
      inputParams: {},
      processedParams: {
        chainId: oThis._auxChainId,
        deployerAddress: oThis.deployerAddress,
        simpleTokenAddress: simpleTokenAddress,
        organizationAddress: organizationAddress
      }
    };

    await oThis._insertIntoChainSetupLogs(chainSetupConstants.deployBaseContractStepKind, deployerResponse);

    await oThis._insertIntoChainAddress(deployerResponse);

    return deployerResponse;
  }

  /***
   *
   * get deployer addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getDeployerAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis._auxChainId,
      kind: chainAddressConstants.deployerKind,
      chainKind: coreConstants.auxChainKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_o_stp_d_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * get simple token contract addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getSimpleTokenContractAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis._originChainId,
      kind: chainAddressConstants.baseContractKind,
      chainKind: coreConstants.originChainKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_o_stp_d_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * get STPrime org contract addr
   *
   * @private
   *
   * @return {Promise}
   *
   */
  async _getSTPrimeOrgContractAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis._auxChainId,
      kind: chainAddressConstants.baseContractOrganizationKind,
      chainKind: coreConstants.auxChainKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_o_stp_d_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * insert STPrime contract address into chain address
   *
   * @return {Promise}
   *
   * @private
   */
  async _insertIntoChainAddress(deployerResponse) {
    const oThis = this;

    if (deployerResponse.isFailure()) return deployerResponse;

    await new ChainAddressModel().insertAddress({
      address: deployerResponse.data['contractAddress'],
      chainId: oThis._auxChainId,
      kind: chainAddressConstants.baseContractKind,
      chainKind: coreConstants.auxChainKind
    });
  }
}

InstanceComposer.registerAsShadowableClass(DeploySimpleTokenPrime, coreConstants.icNameSpace, 'DeploySimpleTokenPrime');

module.exports = DeploySimpleTokenPrime;
