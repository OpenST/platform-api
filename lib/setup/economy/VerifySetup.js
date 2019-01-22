'use strict';

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  MosaicTbd = require('@openstfoundation/mosaic-tbd'),
  GatewayHelper = MosaicTbd.ChainSetup.GatewayHelper;

/*
 * This class helps in verification of economy setup
 *
 */
const rootPrefix = '../../..',
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  VerifiersHelper = require(rootPrefix + '/tools/verifiers/helper'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/sharedCacheManagement/TokenAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  coreConstants = require(rootPrefix + '/config/coreConstants'); // Same contract, so using the chain setup helper

require(rootPrefix + '/lib/cacheManagement/StakerWhitelistedAddress');

class EconomySetupVerifier {
  /**
   * Constructor
   *
   * @param params {Object}
   * @param {Number} params.auxChainId - Auxiliary Chain Id
   * @param {Number} params.originChainId - Origin Chain Id
   * @param {Number} params.tokenId - Token Id
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.originChainId = params.originChainId;
    oThis.auxChainId = params.auxChainId;
    oThis.tokenId = params.tokenId;

    oThis.tokenAddresses = {};
  }

  /**
   * validate
   *
   * @return {Promise<void>}
   */
  async perform() {
    const oThis = this;

    await oThis._setTokenAddresses();

    oThis.tokenAddressKindsMap = new TokenAddressModel().invertedKinds;

    await oThis._setWeb3Objs();

    await oThis._validateAuxTokenOrganization();

    await oThis._validateOriginTokenOrganization();

    await oThis._validateBrandedToken();

    await oThis._validateUtilityBrandedToken();

    await oThis._validateGateway();

    await oThis._validateCoGateway();

    await oThis._validateGatewayComposer();

    await oThis._checkGatewayActivated();

    await oThis._validateSetGateway();

    await oThis._validateSetCoGateway();

    await oThis._validateStakerAddress();

    await oThis._validateOwnerSetAsInternalActor();

    return responseHelper.successWithData({
      taskStatus: workflowStepConstants.taskDone
    });
  }

  /**
   * _setWeb3Objs
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Objs() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.auxChainId]);

    oThis.config = response[oThis.auxChainId.toString()];

    oThis.originWsProviders = oThis.config.originGeth.readWrite.wsProviders;

    oThis.auxWsProviders = oThis.config.auxGeth.readWrite.wsProviders;

    oThis.originWeb3 = web3Provider.getInstance(oThis.originWsProviders[0]).web3WsProvider;
    oThis.auxWeb3 = web3Provider.getInstance(oThis.auxWsProviders[0]).web3WsProvider;

    oThis.auxVerifiersHelper = new VerifiersHelper(oThis.auxWeb3);
    oThis.originVerifiersHelper = new VerifiersHelper(oThis.originWeb3);
  }

  /**
   * _setTokenAddresses
   */
  async _setTokenAddresses() {
    const oThis = this;

    let getAddrRsp = await new TokenAddressCache({
      tokenId: oThis.tokenId
    }).fetch();

    oThis.tokenAddresses = getAddrRsp.data;
  }

  /**
   * _validateDeployedContract
   *
   * @param tokenAddressType
   * @param contractName
   * @param chainType
   * @return {Promise<never>}
   * @private
   */
  async _validateDeployedContract(tokenAddressType, contractName, chainType) {
    const oThis = this;

    let tokenAddress = await oThis.tokenAddresses[tokenAddressType];

    let looksGood;
    if (chainType === 'aux') {
      looksGood = await oThis.auxVerifiersHelper.validateContract(tokenAddress, contractName);
    } else {
      looksGood = await oThis.originVerifiersHelper.validateContract(tokenAddress, contractName);
    }

    if (!looksGood) {
      logger.error('====Validation failed for', tokenAddressType, contractName);
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_v_es_2',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }
  }

  /**
   * _validateBrandedToken - validates branded token is deployed properly or not
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateBrandedToken() {
    const oThis = this;

    await oThis._validateDeployedContract(tokenAddressConstants.brandedTokenContract, 'BrandedToken', 'origin');
  }

  /**
   * _validateUtilityBrandedToken - validates utility branded token is deployed properly or not
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateUtilityBrandedToken() {
    const oThis = this;

    await oThis._validateDeployedContract(
      tokenAddressConstants.utilityBrandedTokenContract,
      'UtilityBrandedToken',
      'aux'
    );
  }

  /**
   * _validateAuxTokenOrganization - validates aux-organization is deployed properly or not
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateAuxTokenOrganization() {
    const oThis = this;

    await oThis._validateDeployedContract(tokenAddressConstants.auxOrganizationContract, 'Organization', 'aux');
  }

  /**
   * _validateOriginTokenOrganization - validates origin organization is deployed properly or not
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateOriginTokenOrganization() {
    const oThis = this;

    await oThis._validateDeployedContract(tokenAddressConstants.originOrganizationContract, 'Organization', 'origin');
  }

  /**
   * _validateGateway - validates gateway is deployed properly or not
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateGateway() {
    const oThis = this;

    await oThis._validateDeployedContract(tokenAddressConstants.tokenGatewayContract, 'EIP20Gateway', 'origin');
  }

  /**
   * _validateCoGateway - validates co-gateway is deployed properly or not
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateCoGateway() {
    const oThis = this;

    await oThis._validateDeployedContract(tokenAddressConstants.tokenCoGatewayContract, 'EIP20CoGateway', 'aux');
  }

  /**
   * _validateGatewayComposer - validates gateway-composer is deployed properly or not
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateGatewayComposer() {
    const oThis = this;

    let stakerAddress = oThis.tokenAddresses[tokenAddressConstants.ownerAddressKind],
      brandedTokenAddess = oThis.tokenAddresses[tokenAddressConstants.brandedTokenContract];

    const StakerWhitelistedAddressCache = oThis
      .ic()
      .getShadowedClassFor(coreConstants.icNameSpace, 'StakerWhitelistedAddressCache');

    let cacheFetchRsp = await new StakerWhitelistedAddressCache({
      tokenId: oThis.tokenId,
      address: stakerAddress
    }).fetch();

    let gatewayComposerAddress = cacheFetchRsp.data['gatewayComposerAddress'];

    let looksGood = await oThis.originVerifiersHelper.validateContract(gatewayComposerAddress, 'GatewayComposer');

    if (!looksGood) {
      logger.error('====Validation failed for', gatewayComposerAddress, 'GatewayComposer');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_v_es_8',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    let gatewayContract = await oThis.originVerifiersHelper.getContractObj('GatewayComposer', gatewayComposerAddress);

    let owner;

    try {
      owner = await gatewayContract.methods.owner().call({});
    } catch (err) {
      owner = null;
    }

    logger.log('owner---', owner);

    let valueToken;

    try {
      valueToken = await gatewayContract.methods.valueToken().call({}); // OST
    } catch (err) {
      valueToken = null;
    }

    logger.log('* Fetching simple token contract address from database.');
    let queryForSTContractRsp = await new ChainAddressModel().fetchAddress({
      chainId: oThis.originChainId,
      kind: chainAddressConstants.baseContractKind
    });
    let dbSimpleTokenContractAddress = queryForSTContractRsp.data.address;

    if (!valueToken || valueToken.toLowerCase() !== dbSimpleTokenContractAddress.toLowerCase()) {
      logger.error('====SimpleToken Address is not correct =====');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_v_es_7',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            valueToken: valueToken,
            dbSimpleTokenContractAddress: dbSimpleTokenContractAddress
          }
        })
      );
    }

    let brandedToken;

    try {
      brandedToken = await gatewayContract.methods.brandedToken().call({}); // BT
    } catch (err) {
      brandedToken = null;
    }

    if (!brandedToken || brandedToken.toLowerCase() !== brandedTokenAddess.toLowerCase()) {
      logger.error('====BT Address is not correct =====');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_v_es_6',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            brandedToken: brandedToken,
            brandedTokenAddess: brandedTokenAddess
          }
        })
      );
    }
  }

  /**
   * _checkGatewayActivated
   *
   * @return {Promise<never>}
   * @private
   */
  async _checkGatewayActivated() {
    const oThis = this;

    oThis.gatewayContractAddress = await oThis.tokenAddresses[tokenAddressConstants.tokenGatewayContract];

    let gatewayContract = await oThis.originVerifiersHelper.getContractObj(
      'EIP20Gateway',
      oThis.gatewayContractAddress
    );

    let gatewayActivated = await gatewayContract.methods.activated().call({});

    if (!gatewayActivated) {
      logger.error('====Gateway not activated =====');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_v_es_3',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }
  }

  /**
   * _validateSetCoGateway
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateSetCoGateway() {
    const oThis = this;

    let ubtContractAddress = await oThis.tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract];

    let tokenCoGatewayAddress = await oThis.tokenAddresses[tokenAddressConstants.tokenCoGatewayContract];

    let ubtContract = await oThis.auxVerifiersHelper.getContractObj('UtilityBrandedToken', ubtContractAddress);

    let coGateway;

    try {
      coGateway = await ubtContract.methods.coGateway().call({});
    } catch (err) {
      coGateway = null;
    }

    if (!coGateway || coGateway.toLowerCase() !== tokenCoGatewayAddress.toLowerCase()) {
      logger.error('====coGateway not set in UBT =====');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_v_es_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            ubtContractAddress: ubtContractAddress,
            coGatewayFromContract: coGateway,
            coGatewayFromDb: tokenCoGatewayAddress
          }
        })
      );
    }
  }

  /**
   * _validateSetGateway
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateSetGateway() {
    const oThis = this;

    // TODO: No provision in contracts currently, check how this can be done

    /*let bTContract = await oThis.auxVerifiersHelper.getContractObj(
      'BrandedToken',
      oThis.tokenAddresses[tokenAddressConstants.brandedTokenContract]
    );

    console.log('bTContract---', bTContract);*/
  }

  /***
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateStakerAddress() {
    const oThis = this;

    let helperObj = new GatewayHelper(oThis.originWeb3, oThis.gatewayContractAddress);

    let stakerAddress = await helperObj.getStakeVault(oThis.gatewayContractAddress);

    let simpleStakeAddressDb = await oThis.tokenAddresses[tokenAddressConstants.simpleStakeContract];

    if (!stakerAddress || stakerAddress.toLowerCase() !== simpleStakeAddressDb.toLowerCase()) {
      logger.error('====Staker address is not correct =====');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_v_es_5',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }
  }

  /***
   *
   * @return {Promise<void>}
   * @private
   */
  async _validateOwnerSetAsInternalActor() {
    const oThis = this;

    let UBTContract = await oThis.auxVerifiersHelper.getContractObj(
      'UtilityBrandedToken',
      oThis.tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract]
    );

    let dbOwnerAddr = oThis.tokenAddresses[tokenAddressConstants.ownerAddressKind],
      isInternalActor;

    try {
      isInternalActor = await UBTContract.methods.isInternalActor(dbOwnerAddr).call({});
    } catch (err) {
      isInternalActor = null;
    }

    if (!isInternalActor) {
      logger.error('====InternalActor not activated =====');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_v_es_10',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }
  }
}

InstanceComposer.registerAsShadowableClass(EconomySetupVerifier, coreConstants.icNameSpace, 'EconomySetupVerifier');

module.exports = EconomySetupVerifier;
