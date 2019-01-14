/*
 * This class helps in verification of economy setup
 *
 */

const rootPrefix = '../..',
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  VerifiersHelper = require(rootPrefix + '/tools/verifiers/helper'),
  TokenAddressModel = require(rootPrefix + '/app/models/mysql/TokenAddress'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  MosaicTbd = require('@openstfoundation/mosaic-tbd'),
  GatewayHelper = MosaicTbd.ChainSetup.GatewayHelper; // Same contract, so using the chain setup helper
let originChainId = process.argv[2],
  auxChainId = process.argv[3],
  tokenId = process.argv[4];

class EconomySetupVerifier {
  constructor() {
    const oThis = this;

    oThis.originChainId = originChainId;
    oThis.auxChainId = auxChainId;
    oThis.tokenId = tokenId;
  }

  /**
   * validate
   *
   * @return {Promise<void>}
   */
  async validate() {
    const oThis = this;

    oThis.tokenAddressKindsMap = new TokenAddressModel().invertedKinds;

    await oThis._setWeb3Objs();

    await oThis._validateAuxTokenOrganization();

    await oThis._validateOriginTokenOrganization();

    await oThis._validateBrandedToken();

    await oThis._validateUtilityBrandedToken();

    await oThis._validateGateway();

    await oThis._validateCoGateway();

    await oThis._checkGatewayActivated();

    await oThis._validateSetGateway();

    await oThis._validateSetCoGateway();

    await oThis._validateStakerAddress();
  }

  /**
   * _setWeb3Objs
   *
   * @return {Promise<void>}
   * @private
   */
  async _setWeb3Objs() {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.originChainId, oThis.auxChainId]);

    oThis.originChainConfig = response[oThis.originChainId];
    oThis.originWsProviders = oThis.originChainConfig.originGeth.readWrite.wsProviders;

    oThis.auxChainConfig = response[oThis.auxChainId];
    oThis.auxWsProviders = oThis.auxChainConfig.auxGeth.readWrite.wsProviders;

    oThis.originWeb3 = web3Provider.getInstance(oThis.originWsProviders[0]).web3WsProvider;
    oThis.auxWeb3 = web3Provider.getInstance(oThis.auxWsProviders[0]).web3WsProvider;

    oThis.auxVerifiersHelper = new VerifiersHelper(oThis.auxWeb3);
    oThis.originVerifiersHelper = new VerifiersHelper(oThis.originWeb3);
  }

  /**
   * _getTokenAddress
   *
   * @return {Promise<void>}
   */
  async _getTokenAddress(addressKind) {
    const oThis = this;

    let getAddrRsp = await new TokenAddressModel().getAddressByTokenIdAndKind({
      tokenId: oThis.tokenId,
      kind: oThis.tokenAddressKindsMap[addressKind]
    });

    if (!getAddrRsp.data) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_v_es_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return getAddrRsp.data.address;
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

    let tokenAddress = await oThis._getTokenAddress(tokenAddressType);

    let looksGood;
    if (chainType == 'aux') {
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
   * _checkGatewayActivated
   *
   * @return {Promise<never>}
   * @private
   */
  async _checkGatewayActivated() {
    const oThis = this;

    oThis.gatewayContractAddress = await oThis._getTokenAddress(tokenAddressConstants.tokenGatewayContract);

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

    let btContractAddress = await oThis._getTokenAddress(tokenAddressConstants.brandedTokenContract);

    let tokenCoGatewayAddress = await oThis._getTokenAddress(tokenAddressConstants.tokenCoGatewayContract);

    let btContract = await oThis.originVerifiersHelper.getContractObj('UtilityBrandedToken', btContractAddress);

    let coGateway;

    try {
      coGateway = await btContract.methods.coGateway().call({});
    } catch (err) {
      coGateway = null;
    }

    if (!coGateway || coGateway != tokenCoGatewayAddress) {
      logger.error('====coGateway not set in UBT =====');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_v_es_4',
          api_error_identifier: 'something_went_wrong'
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
  }

  async _validateStakerAddress() {
    const oThis = this;

    //oThis.gatewayContractAddress = await oThis._getTokenAddress(tokenAddressConstants.tokenGatewayContract);

    let helperObj = new GatewayHelper(oThis.originWeb3, oThis.gatewayContractAddress);

    let stakerAddress = await helperObj.getStakeVault(oThis.gatewayContractAddress);

    let simpleStakeAddressDb = await oThis._getTokenAddress(tokenAddressConstants.simpleStakeContract);

    if (!stakerAddress || stakerAddress != simpleStakeAddressDb) {
      logger.error('====Staker address is not correct =====');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_v_es_5',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }
  }
}

let economySetupVerifier = new EconomySetupVerifier();

economySetupVerifier
  .validate()
  .then(function() {
    logger.win('==== Successfully validated ====');
  })
  .catch(function(err) {
    console.log('==== Error ====\n', err);
  });
