'use strict';

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer,
  MosaicJs = require('@openstfoundation/mosaic.js'),
  OpenSTJs = require('@openstfoundation/openst.js');

/*
 * This class helps in verification of economy setup
 *
 */
const rootPrefix = '../../..',
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  VerifiersHelper = require(rootPrefix + '/tools/verifiers/Helper'),
  OpenSTJsVerifiersHelper = require(rootPrefix + '/tools/verifiers/OpenStJsHelper'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  ruleConstants = require(rootPrefix + '/lib/globalConstant/rule'),
  StakerWhitelistedAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/StakerWhitelistedAddress'),
  coreConstants = require(rootPrefix + '/config/coreConstants'); // Same contract, so using the chain setup helper

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

    await oThis._validateTokenRules();

    await oThis._validatePricerRule();

    await oThis._validateRegisterPricerRule();

    await oThis._validateProxyFactory();

    await oThis._validateInternalActors();

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

    let shuffledAuxWsProviders = basicHelper.shuffleArray(oThis.auxWsProviders),
      shuffledOriginWsProviders = basicHelper.shuffleArray(oThis.originWsProviders);

    oThis.auxWeb3 = web3Provider.getInstance(shuffledAuxWsProviders[0]).web3WsProvider;
    oThis.originWeb3 = web3Provider.getInstance(shuffledOriginWsProviders[0]).web3WsProvider;

    oThis.auxVerifiersHelper = new VerifiersHelper(oThis.auxWeb3);
    oThis.originVerifiersHelper = new VerifiersHelper(oThis.originWeb3);

    oThis.openSTJsVerifiersHelper = new OpenSTJsVerifiersHelper(oThis.auxWeb3);
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
          internal_error_identifier: 'l_s_e_vs_1',
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

    let auxContract = await oThis.auxVerifiersHelper.getContractObj(
      'Organization',
      oThis.tokenAddresses[tokenAddressConstants.auxOrganizationContract]
    );

    let owner;

    try {
      owner = await auxContract.methods.owner().call({});
    } catch (err) {
      owner = null;
    }

    if (!owner || owner.toLowerCase() !== oThis.tokenAddresses[tokenAddressConstants.ownerAddressKind].toLowerCase()) {
      logger.error('====Aux Token organization owner is not correct =====');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_vs_2',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            contractValue: owner,
            dbValue: oThis.tokenAddresses[tokenAddressConstants.ownerAddressKind]
          }
        })
      );
    }

    let admin;

    try {
      admin = await auxContract.methods.admin().call({}); // OST
    } catch (err) {
      admin = null;
    }

    if (
      !admin ||
      admin.toLowerCase() !== oThis.tokenAddresses[tokenAddressConstants.auxAdminAddressKind].toLowerCase()
    ) {
      logger.error('====Aux Token organization admin is not correct =====');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_vs_3',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            contractValue: admin,
            dbValue: oThis.tokenAddresses[tokenAddressConstants.auxAdminAddressKind]
          }
        })
      );
    }

    let isWorker;

    try {
      isWorker = await auxContract.methods
        .isWorker(oThis.tokenAddresses[tokenAddressConstants.auxWorkerAddressKind][0])
        .call({});
    } catch (err) {
      isWorker = null;
    }

    if (!isWorker) {
      logger.error('====Aux worker address is not set correctly in organization contract');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_vs_4',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            contractWorkerValue: isWorker
          }
        })
      );
    }
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

    let organizationContract = await oThis.originVerifiersHelper.getContractObj(
      'Organization',
      oThis.tokenAddresses[tokenAddressConstants.originOrganizationContract]
    );

    let owner;

    try {
      owner = await organizationContract.methods.owner().call({});
    } catch (err) {
      owner = null;
    }

    if (!owner || owner.toLowerCase() !== oThis.tokenAddresses[tokenAddressConstants.ownerAddressKind].toLowerCase()) {
      logger.error('====Origin Token organization owner is not correct =====');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_vs_5',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            contractValue: owner,
            dbValue: oThis.tokenAddresses[tokenAddressConstants.ownerAddressKind]
          }
        })
      );
    }

    let admin;

    try {
      admin = await organizationContract.methods.admin().call({});
    } catch (err) {
      admin = null;
    }

    if (
      !admin ||
      admin.toLowerCase() !== oThis.tokenAddresses[tokenAddressConstants.originAdminAddressKind].toLowerCase()
    ) {
      logger.error('====Origin Token organization admin is not correct =====');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_vs_6',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            contractValue: admin,
            dbValue: oThis.tokenAddresses[tokenAddressConstants.originAdminAddressKind]
          }
        })
      );
    }

    let isWorker;

    try {
      isWorker = await organizationContract.methods
        .isWorker(oThis.tokenAddresses[tokenAddressConstants.originWorkerAddressKind][0])
        .call({});
    } catch (err) {
      isWorker = null;
    }

    if (!isWorker) {
      logger.error('====Origin worker address is not set correctly in organization contract');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_vs_7',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            contractWorkerValue: isWorker
          }
        })
      );
    }
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

    let coGatewayContract = await oThis.auxVerifiersHelper.getContractObj(
      'EIP20CoGateway',
      oThis.tokenAddresses[tokenAddressConstants.tokenCoGatewayContract]
    );

    let utilityToken;

    try {
      utilityToken = await coGatewayContract.methods.utilityToken().call({});
    } catch (err) {
      utilityToken = null;
    }
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
          internal_error_identifier: 'l_s_e_vs_8',
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

    let valueToken;

    try {
      valueToken = await gatewayContract.methods.valueToken().call({}); // OST
    } catch (err) {
      valueToken = null;
    }

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_vs_15',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    let dbSimpleTokenContractAddress = chainAddressesRsp.data[chainAddressConstants.stContractKind].address;

    if (!valueToken || valueToken.toLowerCase() !== dbSimpleTokenContractAddress.toLowerCase()) {
      logger.error('====SimpleToken Address is not correct =====');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_vs_9',
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
          internal_error_identifier: 'l_s_e_vs_10',
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
          internal_error_identifier: 'l_s_e_vs_11',
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
          internal_error_identifier: 'l_s_e_vs_12',
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

    let helperObj = new MosaicJs.ChainSetup.GatewayHelper(oThis.originWeb3, oThis.gatewayContractAddress);

    let stakerAddress = await helperObj.getStakeVault(oThis.gatewayContractAddress);

    let simpleStakeAddressDb = await oThis.tokenAddresses[tokenAddressConstants.simpleStakeContract];

    if (!stakerAddress || stakerAddress.toLowerCase() !== simpleStakeAddressDb.toLowerCase()) {
      logger.error('====Staker address is not correct =====');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_vs_13',
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
  async _validateInternalActors() {
    const oThis = this;

    let UBTContract = await oThis.auxVerifiersHelper.getContractObj(
      'UtilityBrandedToken',
      oThis.tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract]
    );

    let internalActorsToVerify = {
      [tokenAddressConstants.ownerAddressKind]: oThis.tokenAddresses[tokenAddressConstants.ownerAddressKind],
      [tokenAddressConstants.tokenRulesContractKind]: oThis.tokenAddresses[tokenAddressConstants.tokenRulesContractKind]
    };

    for (let addressKind in internalActorsToVerify) {
      let address = internalActorsToVerify[addressKind],
        isInternalActor;

      try {
        isInternalActor = await UBTContract.methods.isInternalActor(address).call({});
      } catch (err) {
        isInternalActor = null;
      }

      if (!isInternalActor) {
        logger.error(`====InternalActor not activated for kind: ${addressKind} address: ${address} =====`);
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'l_s_e_vs_14',
            api_error_identifier: 'something_went_wrong'
          })
        );
      }
    }
  }

  /**
   * Validates Token Rules Deployment
   * Validates following
   *  1. Byte Code
   *  2. utility branded token address
   *  2. aux token organization address
   *
   * @return {Promise<never>}
   * @private
   */
  async _validateTokenRules() {
    const oThis = this;

    let looksGood = await oThis.openSTJsVerifiersHelper.validateContract(
      oThis.tokenAddresses[tokenAddressConstants.tokenRulesContractKind],
      'TokenRules'
    );

    if (!looksGood) {
      logger.error('====Validation failed for TokenRules Contract Deployment');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_vs_23',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    let tokenRulesContract = await oThis.openSTJsVerifiersHelper.getContractObj(
      'TokenRules',
      oThis.tokenAddresses[tokenAddressConstants.tokenRulesContractKind]
    );

    let token;
    try {
      token = await tokenRulesContract.methods.token().call({});
    } catch (err) {
      token = null;
    }

    if (
      !token ||
      token.toLowerCase() !== oThis.tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract].toLowerCase()
    ) {
      logger.error('====Utility branded token address is incorrect in TokenRules =====');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_vs_16',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            tokenAddress: token
          }
        })
      );
    }

    let tokenOrganization;

    try {
      tokenOrganization = await tokenRulesContract.methods.organization().call({});
    } catch (err) {
      tokenOrganization = null;
    }

    if (
      !tokenOrganization ||
      tokenOrganization.toLowerCase() !==
        oThis.tokenAddresses[tokenAddressConstants.auxOrganizationContract].toLowerCase()
    ) {
      logger.error('====token organization is not set in TokenRules =====');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_vs_17',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            tokenOrganiztion: tokenOrganization
          }
        })
      );
    }
  }

  /**
   * Validates Pricer Rule Deployment
   * Validates following
   *  1. Byte Code
   *  2. utility branded token address
   *  3. aux token organization address
   *  4. token rules address for which pricer rule is deployed
   *
   * @return {Promise<never>}
   * @private
   */
  async _validatePricerRule() {
    const oThis = this;

    oThis.pricerRuleAddress = await oThis.openSTJsVerifiersHelper.getPricerRuleAddr(oThis.tokenId);

    let looksGood = await oThis.openSTJsVerifiersHelper.validateContract(oThis.pricerRuleAddress, 'PricerRule');

    if (!looksGood) {
      logger.error('====Validation failed for PricerRule Contract Deployment');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_vs_24',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    let pricerRuleContract = await oThis.openSTJsVerifiersHelper.getContractObj('PricerRule', oThis.pricerRuleAddress);

    let token;

    try {
      token = await pricerRuleContract.methods.eip20Token().call({});
    } catch (err) {
      token = null;
    }

    if (
      !token ||
      token.toLowerCase() !== oThis.tokenAddresses[tokenAddressConstants.utilityBrandedTokenContract].toLowerCase()
    ) {
      logger.error('====Utility branded token address is incorrect in PricerRule =====');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_vs_18',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            tokenAddress: token
          }
        })
      );
    }

    let tokenOrganization;

    try {
      tokenOrganization = await pricerRuleContract.methods.organization().call({});
    } catch (err) {
      tokenOrganization = null;
    }

    if (
      !tokenOrganization ||
      tokenOrganization.toLowerCase() !==
        oThis.tokenAddresses[tokenAddressConstants.auxOrganizationContract].toLowerCase()
    ) {
      logger.error('====token organization is not set in PricerRule =====');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_vs_19',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            tokenOrganiztion: tokenOrganization
          }
        })
      );
    }

    let tokenRules;

    try {
      tokenRules = await pricerRuleContract.methods.tokenRules().call({});
    } catch (err) {
      tokenRules = null;
    }

    if (
      !tokenRules ||
      tokenRules.toLowerCase() !== oThis.tokenAddresses[tokenAddressConstants.tokenRulesContractKind].toLowerCase()
    ) {
      logger.error('====Token rules address is incorrect in PricerRule =====');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_vs_20',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            tokenRules: tokenRules
          }
        })
      );
    }
  }

  /**
   * Validates register pricer rule
   * Validates following
   *  1. Compares rule name and rule address from contract getter with DB values
   *
   * @return {Promise<never>}
   * @private
   */
  async _validateRegisterPricerRule() {
    const oThis = this;

    let TokenRulesHelper = OpenSTJs.Helpers.TokenRules,
      getRuleByAddressRsp = await new TokenRulesHelper(
        oThis.tokenAddresses[tokenAddressConstants.tokenRulesContractKind],
        oThis.auxWeb3
      ).getRuleByAddress(oThis.pricerRuleAddress);

    let pricerRuleName = getRuleByAddressRsp[0],
      pricerRuleAddress = getRuleByAddressRsp[1];

    if (
      pricerRuleName !== ruleConstants.pricerRuleName ||
      pricerRuleAddress.toLowerCase() !== oThis.pricerRuleAddress
    ) {
      logger.error('====PricerRule is not correctly registered in Token Rules=====');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_vs_21',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            getRuleByAddressRsp: getRuleByAddressRsp
          }
        })
      );
    }
  }

  /**
   * Validate Proxy Factory contract
   * Validates following
   *  1. Byte Code
   *
   * @return {Promise<never>}
   * @private
   */
  async _validateProxyFactory() {
    const oThis = this;

    let looksGood = await oThis.openSTJsVerifiersHelper.validateContract(
      oThis.tokenAddresses[tokenAddressConstants.proxyFactoryContractKind],
      'ProxyFactory'
    );

    if (!looksGood) {
      logger.error('====Validation failed for ProxyFactory');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_s_e_vs_22',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }
  }
}

InstanceComposer.registerAsShadowableClass(EconomySetupVerifier, coreConstants.icNameSpace, 'EconomySetupVerifier');

module.exports = EconomySetupVerifier;
