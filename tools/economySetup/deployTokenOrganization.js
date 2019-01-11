'use strict';

/**
 * setup organization for anchor contract
 *
 * @module tools/chainSetup/SetupAnchorOrganization
 */
const rootPrefix = '../..',
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  ConfigStrategyObject = require(rootPrefix + '/helpers/configStrategy/Object'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  TokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  SetupOrganizationHelper = require(rootPrefix + '/tools/commonSetup/SetupOrganization'),
  gasPriceCacheKlass = require(rootPrefix + '/lib/sharedCacheManagement/EstimateOriginChainGasPrice');

/**
 *
 * @class
 */
class deployTokenOrganization {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {String} params.chainKind - origin / aux (chain kind for which anchor org is to be setup)
   * @param {String} params.addressKind - baseContractOrganization / anchorOrganization
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params['tokenId'];
    oThis.clientId = params['clientId'];
    oThis.chainId = params['chainId'];

    oThis.deployToChainKind = params['deployToChainKind'];
    oThis.addressKindMap = {};
    oThis.deployChainId = null;
    oThis.gasPrice = null;
  }

  /**
   *
   * Perform
   *
   * @return {Promise<result>}
   *
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
          internal_error_identifier: 't_cs_sao_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /***
   *
   * @private
   *
   * @return {Promise<result>}
   */
  async _asyncPerform() {
    const oThis = this;

    await oThis._initializeVars();

    await oThis._getAddresses();

    let signerAddress = await oThis._getDeployerAddr(),
      ownerAddress = await oThis._getAddressesFor(TokenAddressConstants.ownerAddressKind),
      adminAddress = await oThis._getAddressesFor(TokenAddressConstants.adminAddressKind),
      workerAddresses = await oThis._getAddressesFor(TokenAddressConstants.workerAddressKind);

    let params = {
      chainId: oThis.deployChainId,
      signerAddress: signerAddress,
      chainEndpoint: oThis._configStrategyObject.chainWsProvider(oThis.deployChainId, 'readWrite'),
      gasPrice: oThis.gasPrice,
      ownerAddress: ownerAddress,
      adminAddress: adminAddress,
      workerAddresses: workerAddresses
    };

    let setupOrganizationHelper = new SetupOrganizationHelper(params);
    let setupRsp = await setupOrganizationHelper.perform();
    if (setupRsp && setupRsp.isFailure()) {
      return Promise.reject(setupRsp);
    }
    let tokenOriginOrganizationContractAddress = setupRsp.data.contractAddress,
      tokenOriginOrganizationDeployTxHash = setupRsp.data.transactionHash;

    await oThis._insertIntoTokenAddresses(tokenOriginOrganizationContractAddress);

    let taskResponseData = {
      [oThis._contractResponseKey()]: tokenOriginOrganizationContractAddress
    };

    // if only transaction hash is returned, insert into pendingTransactions.

    return Promise.resolve(
      responseHelper.successWithData({
        taskDone: 1,
        taskResponseData: taskResponseData,
        transactionHash: tokenOriginOrganizationDeployTxHash
      })
    );
  }

  /**
   * Set Basic parameters.
   *
   * @returns {Promise<>}
   *
   * @private
   *
   */
  async _initializeVars() {
    const oThis = this;

    switch (oThis.deployToChainKind) {
      case coreConstants.originChainKind:
        oThis.deployChainId = oThis._configStrategyObject.originChainId;

        let gasPriceCacheObj = new gasPriceCacheKlass(),
          gasPriceRsp = await gasPriceCacheObj.fetch();
        oThis.gasPrice = gasPriceRsp.data;
        break;
      case coreConstants.auxChainKind:
        oThis.deployChainId = oThis.chainId;
        // TODO :: Gasprice should not be 0 hardcoded.
        oThis.gasPrice = '0x0';
        break;
      default:
        throw `unsupported deployToChainKind: ${oThis.deployToChainKind}`;
    }
  }

  /**
   * Get address of various kinds.
   *
   * @returns {Promise<>}
   * @private
   * @sets addressKindMap
   */
  async _getAddresses() {
    const oThis = this;
    let addresses = await new TokenAddressModel()
      .select('*')
      .where([
        'token_id = ? AND kind in (?)',
        oThis.tokenId,
        [
          new TokenAddressModel().invertedKinds[TokenAddressConstants.ownerAddressKind],
          new TokenAddressModel().invertedKinds[TokenAddressConstants.adminAddressKind],
          new TokenAddressModel().invertedKinds[TokenAddressConstants.workerAddressKind]
        ]
      ])
      .order_by('id DESC')
      .fire();

    for (let i = 0; i < addresses.length; i++) {
      let addressData = addresses[i],
        addressKind = new TokenAddressModel().kinds[addressData.kind];
      oThis.addressKindMap[addressKind] = oThis.addressKindMap[addressKind] || [];
      oThis.addressKindMap[addressKind].push(addressData.address);
    }
  }

  /**
   *
   * @param kind {string} address got given kind
   *
   * @returns {string} one address for uniq kinds, and array for multiple possible kinds.
   * @private
   */
  _getAddressesFor(addressKind) {
    const oThis = this;

    if (TokenAddressConstants.uniqueKinds.indexOf(addressKind) > -1) {
      return oThis.addressKindMap[addressKind][0];
    } else {
      return oThis.addressKindMap[addressKind];
    }
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
  async _getDeployerAddr() {
    const oThis = this;

    let fetchAddrRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.deployChainId,
      kind: chainAddressConstants.deployerKind,
      chainKind: coreConstants.auxChainKind
    });

    if (!fetchAddrRsp.data.address) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_cs_a_stp_do_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return fetchAddrRsp.data.address;
  }

  /***
   *
   * config strategy
   *
   * @return {object}
   */
  get _configStrategy() {
    const oThis = this;
    return oThis.ic().configStrategy;
  }

  /***
   *
   * object of config strategy klass
   *
   * @return {object}
   */
  get _configStrategyObject() {
    const oThis = this;
    if (oThis.configStrategyObj) return oThis.configStrategyObj;
    oThis.configStrategyObj = new ConfigStrategyObject(oThis._configStrategy);
    return oThis.configStrategyObj;
  }

  /**
   *
   * @param organizationContractAddress
   * @returns {Promise<>}
   * @private
   */
  async _insertIntoTokenAddresses(organizationContractAddress) {
    const oThis = this;
    let contractKind = oThis._contractKind();

    await new TokenAddressModel()
      .insert({
        token_id: oThis.tokenId,
        kind: contractKind,
        address: organizationContractAddress
      })
      .fire();
  }

  /**
   *
   * @returns {*}
   * @private
   */
  _contractKind() {
    const oThis = this;
    if (oThis.deployToChainKind == coreConstants.originChainKind) {
      return new TokenAddressModel().invertedKinds[TokenAddressConstants.originOrganizationContract];
    } else {
      return new TokenAddressModel().invertedKinds[TokenAddressConstants.auxOrganizationContract];
    }
  }

  /**
   *
   * @returns {*}
   * @private
   */
  _contractResponseKey() {
    const oThis = this;
    if (oThis.deployToChainKind == coreConstants.originChainKind) {
      return 'tokenOriOrgCntrctAddr';
    } else {
      return 'tokenAuxOrgCntrctAddr';
    }
  }
}

InstanceComposer.registerAsShadowableClass(
  deployTokenOrganization,
  coreConstants.icNameSpace,
  'deployTokenOrganization'
);

module.exports = deployTokenOrganization;
