'use strict';
/**
 * Economy setup router
 *
 * @module executables/workflowRouter/EconomySetupRouter
 */
const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../..',
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  tokenConstants = require(rootPrefix + '/lib/globalConstant/token'),
  SyncInView = require(rootPrefix + '/app/services/token/SyncInView'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  WorkflowStepsModel = require(rootPrefix + '/app/models/mysql/WorkflowStep'),
  WorkflowRouterBase = require(rootPrefix + '/executables/workflowRouter/Base'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  FundStPrimeToTokenAddress = require(rootPrefix + '/lib/fund/stPrime/TokenAddress'),
  generateTokenAddresses = require(rootPrefix + '/lib/setup/economy/GenerateKnownAddresses'),
  economySetupConfig = require(rootPrefix + '/executables/workflowRouter/economySetupConfig'),
  VerifyTransactionStatus = require(rootPrefix + '/lib/setup/economy/VerifyTransactionStatus'),
  PostGatewayComposerDeploy = require(rootPrefix + '/lib/setup/economy/PostGatewayComposerDeploy'),
  GenerateExTxWorker = require(rootPrefix + '/lib/executeTransactionManagement/GenerateExTxWorker'),
  InsertAddressIntoTokenAddress = require(rootPrefix + '/lib/setup/economy/InsertAddressIntoTokenAddress'),
  PostPricerRuleDeploy = require(rootPrefix + '/lib/setup/economy/PostPricerRuleDeploy'),
  PostRegisterPricerRule = require(rootPrefix + '/lib/setup/economy/PostRegisterPricerRule'),
  util = require(rootPrefix + '/lib/util');

// Following require(s) for registering into instance composer
require(rootPrefix + '/lib/setup/economy/VerifySetup');
require(rootPrefix + '/lib/setup/economy/VerifySetup');
require(rootPrefix + '/app/services/token/SyncInView');
require(rootPrefix + '/lib/setup/economy/DeployGateway');
require(rootPrefix + '/lib/setup/economy/SetGatewayInBT');
require(rootPrefix + '/lib/setup/economy/DeployCoGateway');
require(rootPrefix + '/lib/setup/economy/ActivateGateway');
require(rootPrefix + '/lib/setup/economy/PostGatewayDeploy');
require(rootPrefix + '/lib/setup/economy/DeployGatewayComposer');
require(rootPrefix + '/lib/setup/economy/brandedToken/DeployBT');
require(rootPrefix + '/lib/setup/economy/brandedToken/DeployUBT');
require(rootPrefix + '/lib/setup/economy/SetCoGatewayInUtilityBT');
require(rootPrefix + '/lib/setup/economy/DeployTokenOrganization');
require(rootPrefix + '/lib/setup/economy/SetInternalActorForOwnerInUBT');
require(rootPrefix + '/lib/setup/economy/AssignShardsForClient');
require(rootPrefix + '/lib/setup/economy/DeployTokenRules');
require(rootPrefix + '/lib/setup/economy/DeployTokenHolderMaster');
require(rootPrefix + '/lib/setup/economy/DeployUserWalletFactory');
require(rootPrefix + '/lib/setup/economy/DeployGnosisSafeMultiSigMaster');
require(rootPrefix + '/lib/setup/economy/DeployPricerRule');
require(rootPrefix + '/lib/setup/economy/RegisterPricerRule');
require(rootPrefix + '/lib/setup/economy/AddPriceOracleToPricerRule');
require(rootPrefix + '/lib/setup/economy/SetAcceptedMarginInPricerRule');

/**
 * Class for economy setup router.
 *
 * @class
 */
class EconomySetupRouter extends WorkflowRouterBase {
  /**
   * Constructor for Economy setup router.
   *
   * @augments WorkflowRouterBase
   *
   * @constructor
   */
  constructor(params) {
    params['workflowKind'] = workflowConstants.tokenDeployKind; // Assign workflowKind.

    super(params);
  }

  /**
   * Fetch current step config for every router.
   *
   * @private
   */
  _fetchCurrentStepConfig() {
    const oThis = this;

    oThis.currentStepConfig = economySetupConfig[oThis.stepKind];
  }

  /**
   * Perform step.
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _performStep() {
    const oThis = this;

    const configStrategy = await oThis.getConfigStrategy(),
      ic = new InstanceComposer(configStrategy);

    oThis.requestParams.pendingTransactionExtraData = oThis._currentStepPayloadForPendingTrx();

    switch (oThis.stepKind) {
      case workflowStepConstants.economySetupInit:
        logger.step('*** Economy Setup Init');
        return oThis.insertInitStep();

      case workflowStepConstants.generateTokenAddresses:
        logger.step('*** Generate Token Addresses');
        return new generateTokenAddresses(oThis.requestParams).perform();

      case workflowStepConstants.generateTxWorkerAddresses:
        logger.step('*** Generate Tx worker  Addresses');
        let generateExTxWorker = new GenerateExTxWorker({
          tokenId: oThis.requestParams.tokenId,
          chainId: oThis.requestParams.auxChainId
        });

        return await generateExTxWorker.perform();

      case workflowStepConstants.fundAuxFunderAddress:
        logger.step('*** Funding Aux Funder');

        oThis.requestParams.addressKind = tokenAddressConstants.auxFunderAddressKind;

        return new FundStPrimeToTokenAddress(oThis.requestParams).perform();

      case workflowStepConstants.verifyFundAuxFunderAddress:
        logger.step('*** Verifying if Funding Aux Funder was done');

        return new VerifyTransactionStatus({
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.fundAuxFunderAddress),
          chainId: oThis.requestParams.auxChainId
        }).perform();

      case workflowStepConstants.fundAuxAdminAddress:
        logger.step('*** Funding Aux Admin');

        oThis.requestParams.addressKind = tokenAddressConstants.auxAdminAddressKind;

        return new FundStPrimeToTokenAddress(oThis.requestParams).perform();

      case workflowStepConstants.verifyFundAuxAdminAddress:
        logger.step('*** Verifying if Funding Aux Admin was done');

        return new VerifyTransactionStatus({
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.fundAuxAdminAddress),
          chainId: oThis.requestParams.auxChainId
        }).perform();

      case workflowStepConstants.fundAuxWorkerAddress:
        logger.step('*** Funding Aux Worker');

        oThis.requestParams.addressKind = tokenAddressConstants.auxWorkerAddressKind;

        return new FundStPrimeToTokenAddress(oThis.requestParams).perform();

      case workflowStepConstants.verifyFundAuxWorkerAddress:
        logger.step('*** Verifying if Funding Aux Worker was done');

        return new VerifyTransactionStatus({
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.fundAuxWorkerAddress),
          chainId: oThis.requestParams.auxChainId
        }).perform();

      case workflowStepConstants.deployOriginTokenOrganization:
        logger.step('*** Deploy Origin Token Organization');

        let deployOrigTokenOrganizationKlass = ic.getShadowedClassFor(
          coreConstants.icNameSpace,
          'DeployTokenOrganization'
        );
        oThis.requestParams.deployToChainKind = coreConstants.originChainKind;
        return new deployOrigTokenOrganizationKlass(oThis.requestParams).perform();

      case workflowStepConstants.saveOriginTokenOrganization:
        logger.step('*** Saving Origin Organization Address In DB');

        return new InsertAddressIntoTokenAddress({
          tokenId: oThis.requestParams.tokenId,
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.deployOriginTokenOrganization),
          kind: tokenAddressConstants.originOrganizationContract,
          chainId: oThis.requestParams.originChainId
        }).perform();

      case workflowStepConstants.saveAuxTokenOrganization:
        logger.step('*** Saving Aux Organization Address In DB');

        return new InsertAddressIntoTokenAddress({
          tokenId: oThis.requestParams.tokenId,
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.deployAuxTokenOrganization),
          kind: tokenAddressConstants.auxOrganizationContract,
          chainId: oThis.requestParams.auxChainId
        }).perform();

      case workflowStepConstants.saveOriginBrandedToken:
        logger.step('*** Saving Origin BT Address In DB');

        return new InsertAddressIntoTokenAddress({
          tokenId: oThis.requestParams.tokenId,
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.deployOriginBrandedToken),
          kind: tokenAddressConstants.brandedTokenContract,
          chainId: oThis.requestParams.originChainId
        }).perform();

      case workflowStepConstants.saveUtilityBrandedToken:
        logger.step('*** Saving Utility Branded Token Address In DB');

        return new InsertAddressIntoTokenAddress({
          tokenId: oThis.requestParams.tokenId,
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.deployUtilityBrandedToken),
          kind: tokenAddressConstants.utilityBrandedTokenContract,
          chainId: oThis.requestParams.auxChainId
        }).perform();

      case workflowStepConstants.saveTokenGateway:
        logger.step('*** Saving Token Gateway Address In DB');

        let Klass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'PostGatewayDeploy');

        return new Klass({
          tokenId: oThis.requestParams.tokenId,
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.deployTokenGateway),
          kind: tokenAddressConstants.tokenGatewayContract,
          chainId: oThis.requestParams.originChainId
        }).perform();

      case workflowStepConstants.saveTokenCoGateway:
        logger.step('*** Saving Token Co-Gateway Address In DB');

        return new InsertAddressIntoTokenAddress({
          tokenId: oThis.requestParams.tokenId,
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.deployTokenCoGateway),
          kind: tokenAddressConstants.tokenCoGatewayContract,
          chainId: oThis.requestParams.auxChainId
        }).perform();

      case workflowStepConstants.deployOriginBrandedToken:
        logger.step('*** Deploy Origin Branded Token');

        let deployBrandeTokenKlass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployOriginBrandedToken');
        return new deployBrandeTokenKlass(oThis.requestParams).perform();

      case workflowStepConstants.deployAuxTokenOrganization:
        logger.step('*** Deploy Aux Token Organization');

        let deployAuxTokenOrganizationKlass = ic.getShadowedClassFor(
          coreConstants.icNameSpace,
          'DeployTokenOrganization'
        );
        oThis.requestParams.deployToChainKind = coreConstants.auxChainKind;
        return new deployAuxTokenOrganizationKlass(oThis.requestParams).perform();

      case workflowStepConstants.deployUtilityBrandedToken:
        logger.step('*** Deploy Utility Branded Token');

        let deployUtilityBrandeTokenKlass = ic.getShadowedClassFor(
          coreConstants.icNameSpace,
          'DeployUtilityBrandedToken'
        );
        return new deployUtilityBrandeTokenKlass(oThis.requestParams).perform();

      case workflowStepConstants.deployTokenGateway:
        logger.step('*** Deploy Gateway');

        let TokenDeployGatewayKlass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenDeployGateway');
        return new TokenDeployGatewayKlass(oThis.requestParams).perform();

      case workflowStepConstants.updateTokenInOstView:
        logger.step('*** Sync Token Details in OST View');

        let SyncInView = ic.getShadowedClassFor(coreConstants.icNameSpace, 'SyncInView');
        return new SyncInView({
          tokenId: oThis.requestParams.tokenId,
          chainId: oThis.chainId,
          clientId: oThis.requestParams.clientId
        }).perform();

      case workflowStepConstants.deployTokenCoGateway:
        logger.step('*** Deploy CoGateway');

        let TokenDeployCoGatewayKlass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'TokenDeployCoGateway');
        return new TokenDeployCoGatewayKlass(oThis.requestParams).perform();

      case workflowStepConstants.activateTokenGateway:
        logger.step('*** Activate Gateway');

        let ActivateTokenGatewayKlass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'ActivateTokenGateway');
        return new ActivateTokenGatewayKlass(oThis.requestParams).perform();

      case workflowStepConstants.verifyActivateTokenGateway:
        logger.step('*** Verify if Gateway Was Activated');

        return new VerifyTransactionStatus({
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.activateTokenGateway),
          chainId: oThis.requestParams.originChainId
        }).perform();

      case workflowStepConstants.setCoGatewayInUbt:
        logger.step('*** Set CoGateway in UBT');

        let setCoGatewayInUbtKlass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetCoGatewayInUtilityBT');
        return new setCoGatewayInUbtKlass(oThis.requestParams).perform();

      case workflowStepConstants.verifySetCoGatewayInUbt:
        logger.step('*** Verify if CoGateway Was set in UBT');

        return new VerifyTransactionStatus({
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.setCoGatewayInUbt),
          chainId: oThis.requestParams.auxChainId
        }).perform();

      case workflowStepConstants.setGatewayInBt:
        logger.step('*** Set Gateway in BT');

        let setGatewayInBtKlass = ic.getShadowedClassFor(coreConstants.icNameSpace, 'SetGatewayInBT');
        return new setGatewayInBtKlass(oThis.requestParams).perform();

      case workflowStepConstants.verifySetGatewayInBt:
        logger.step('*** Verify if Gateway Was Set in BT');

        return new VerifyTransactionStatus({
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.setGatewayInBt),
          chainId: oThis.requestParams.originChainId
        }).perform();

      case workflowStepConstants.deployGatewayComposer:
        logger.step('*** Deploy Gateway Composer');

        let DeployGatewayComposer = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployGatewayComposer');
        return new DeployGatewayComposer(oThis.requestParams).perform();

      case workflowStepConstants.verifyDeployGatewayComposer:
        logger.step('*** Verify if Gateway Composer was deployed');

        return new PostGatewayComposerDeploy({
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.deployGatewayComposer),
          tokenId: oThis.requestParams.tokenId,
          chainId: oThis.requestParams.originChainId,
          clientId: oThis.requestParams.clientId
        }).perform();

      case workflowStepConstants.setInternalActorForOwnerInUBT:
        logger.step('*** Set Internal Actor For Owner');

        let SetInternalActorForOwnerInUBT = ic.getShadowedClassFor(
          coreConstants.icNameSpace,
          'SetInternalActorForOwnerInUBT'
        );
        return new SetInternalActorForOwnerInUBT(oThis.requestParams).perform();

      case workflowStepConstants.verifySetInternalActorForOwnerInUBT:
        logger.step('*** Verify internal actor was set for owner');

        return new VerifyTransactionStatus({
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.setInternalActorForOwnerInUBT),
          chainId: oThis.requestParams.auxChainId
        }).perform();

      case workflowStepConstants.deployTokenRules:
        logger.step('*** Deploy Token Rules');

        let DeployTokenRules = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployTokenRules');

        let deployTokenRules = new DeployTokenRules(oThis.requestParams);

        return deployTokenRules.perform();

      case workflowStepConstants.saveTokenRules:
        logger.step('*** Saving Token Rules Address in DB');

        return new InsertAddressIntoTokenAddress({
          tokenId: oThis.requestParams.tokenId,
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.deployTokenRules),
          kind: tokenAddressConstants.tokenRulesContractKind,
          chainId: oThis.requestParams.auxChainId
        }).perform();

      case workflowStepConstants.deployTokenHolderMasterCopy:
        logger.step('*** Deploy Token Holder MasterCopy');

        let DeployTokenHolderMaster = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployTokenHolderMaster');

        let deployTokenHolderMaster = new DeployTokenHolderMaster(oThis.requestParams);

        return deployTokenHolderMaster.perform();

      case workflowStepConstants.saveTokenHolderMasterCopy:
        logger.step('*** Saving Token Holder Address in DB');

        return new InsertAddressIntoTokenAddress({
          tokenId: oThis.requestParams.tokenId,
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.deployTokenHolderMasterCopy),
          kind: tokenAddressConstants.tokenHolderMasterCopyContractKind,
          chainId: oThis.requestParams.auxChainId
        }).perform();

      case workflowStepConstants.deployUserWalletFactory:
        logger.step('*** Deploy User wallet Factory');

        let DeployUserWalletFactory = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployUserWalletFactory');

        let deployUserWalletFactory = new DeployUserWalletFactory(oThis.requestParams);

        return deployUserWalletFactory.perform();

      case workflowStepConstants.saveUserWalletFactory:
        logger.step('*** Saving User Wallet Factory');

        return new InsertAddressIntoTokenAddress({
          tokenId: oThis.requestParams.tokenId,
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.deployUserWalletFactory),
          kind: tokenAddressConstants.userWalletFactoryContractKind,
          chainId: oThis.requestParams.auxChainId
        }).perform();

      case workflowStepConstants.deployGnosisSafeMultiSigMasterCopy:
        logger.step('*** Deploy GnosisSafe MultiSig MasterCopy');

        let DeployGnosisSafeMultiSigMaster = ic.getShadowedClassFor(
          coreConstants.icNameSpace,
          'DeployGnosisSafeMultiSigMaster'
        );

        let deployGnosisSafeMultiSigMaster = new DeployGnosisSafeMultiSigMaster(oThis.requestParams);

        return deployGnosisSafeMultiSigMaster.perform();

      case workflowStepConstants.saveGnosisSafeMultiSigMasterCopy:
        logger.step('*** Save GnosisSafe MultiSig MasterCopy Address in DB');

        return new InsertAddressIntoTokenAddress({
          tokenId: oThis.requestParams.tokenId,
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.deployGnosisSafeMultiSigMasterCopy),
          kind: tokenAddressConstants.gnosisSafeMultiSigMasterCopyContractKind,
          chainId: oThis.requestParams.auxChainId
        }).perform();

      case workflowStepConstants.deployPricerRule:
        logger.step('*** Deploy Pricer Rule');

        let DeployPricerRule = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeployPricerRule');

        let deployPricerRule = new DeployPricerRule(oThis.requestParams);

        return deployPricerRule.perform();

      case workflowStepConstants.savePricerRule:
        logger.step('*** Save Pricer Rule Address in DB');

        return new PostPricerRuleDeploy({
          tokenId: oThis.requestParams.tokenId,
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.deployPricerRule),
          auxChainId: oThis.requestParams.auxChainId
        }).perform();

      case workflowStepConstants.registerPricerRule:
        logger.step('*** Register Pricer Rule');

        let RegisterPricerRule = ic.getShadowedClassFor(coreConstants.icNameSpace, 'RegisterPricerRule');

        let registerPricerRule = new RegisterPricerRule(oThis.requestParams);

        return registerPricerRule.perform();

      case workflowStepConstants.verifyRegisterPricerRule:
        logger.step('*** Verify Pricer Rule was registered');

        return new PostRegisterPricerRule({
          tokenId: oThis.requestParams.tokenId,
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.deployPricerRule),
          auxChainId: oThis.requestParams.auxChainId
        }).perform();

      case workflowStepConstants.addPriceOracleInPricerRule:
        logger.step('*** Add Price Oracle To Pricer Rule');

        let AddPriceOracleToPricerRule = ic.getShadowedClassFor(
          coreConstants.icNameSpace,
          'AddPriceOracleToPricerRule'
        );

        let addPriceOracleToPricerRule = new AddPriceOracleToPricerRule(oThis.requestParams);

        return addPriceOracleToPricerRule.perform();

      case workflowStepConstants.verifyAddPriceOracleInPricerRule:
        logger.step('*** Verify Add Price Oracle To Pricer Rule');

        return new VerifyTransactionStatus({
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.addPriceOracleInPricerRule),
          chainId: oThis.requestParams.auxChainId
        }).perform();

      case workflowStepConstants.setAcceptedMarginInPricerRule:
        logger.step('*** Set accepted margin in pricer rule');

        let SetAcceptedMarginInPricerRule = ic.getShadowedClassFor(
          coreConstants.icNameSpace,
          'SetAcceptedMarginInPricerRule'
        );

        let setAcceptedMarginInPricerRule = new SetAcceptedMarginInPricerRule(oThis.requestParams);

        return setAcceptedMarginInPricerRule.perform();

      case workflowStepConstants.verifySetAcceptedMarginInPricerRule:
        logger.step('*** Verify Set accepted margin in pricer rule');

        return new VerifyTransactionStatus({
          transactionHash: oThis.getTransactionHashForKind(workflowStepConstants.setAcceptedMarginInPricerRule),
          chainId: oThis.requestParams.auxChainId
        }).perform();

      case workflowStepConstants.verifyEconomySetup:
        logger.step('*** Verify Economy Setup');

        let VerifyEconomySetup = ic.getShadowedClassFor(coreConstants.icNameSpace, 'EconomySetupVerifier');

        let obj = new VerifyEconomySetup({
          tokenId: oThis.requestParams.tokenId,
          originChainId: oThis.requestParams.originChainId,
          auxChainId: oThis.requestParams.auxChainId
        });

        return obj.perform();

      case workflowStepConstants.assignShards:
        logger.step('*** Assign shards for token');

        let AssignShardsForClient = ic.getShadowedClassFor(coreConstants.icNameSpace, 'AssignShardsForClient');

        let assignShards = new AssignShardsForClient({
          tokenId: oThis.requestParams.tokenId,
          clientId: oThis.requestParams.clientId
        });

        return assignShards.perform();

      case workflowStepConstants.markSuccess:
        logger.step('*** Mark Economy Setup As Success');

        return oThis._tokenDeploymentCompleted();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark Economy Setup As Failed');

        return oThis._tokenDeploymentFailed();

      default:
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_wr_esr_1',
            api_error_identifier: 'something_went_wrong',
            debug_options: { workflowId: oThis.workflowId }
          })
        );
    }
  }

  /**
   * Get config strategy.
   *
   * @return {Promise<*>}
   */
  async getConfigStrategy() {
    const oThis = this;

    let rsp = await chainConfigProvider.getFor([oThis.chainId]);

    return rsp[oThis.chainId];
  }

  /**
   * Get transaction hash for given kind
   *
   * @param {String} kindStr
   *
   * @return {*}
   */
  getTransactionHashForKind(kindStr) {
    const oThis = this,
      kindInt = +new WorkflowStepsModel().invertedKinds[kindStr];

    for (let workflowKind in oThis.workflowStepKindToRecordMap) {
      let workflowData = oThis.workflowStepKindToRecordMap[workflowKind];

      if (workflowData.kind === kindInt) {
        return workflowData.transaction_hash;
      }
    }

    return '';
  }

  /**
   * Mark token deployment as successful in tokens table.
   *
   * @return {Promise<any>}
   */
  async _tokenDeploymentCompleted() {
    const oThis = this;

    // Update status of token deployment as deploymentCompleted in tokens table.
    let tokenModelResp = await new TokenModel()
      .update({
        status: new TokenModel().invertedStatuses[tokenConstants.deploymentCompleted]
      })
      .where({
        client_id: oThis.clientId,
        status: new TokenModel().invertedStatuses[tokenConstants.deploymentStarted]
      })
      .fire();

    // Clear token cache.
    await TokenModel.flushCache({ clientId: oThis.clientId, tokenId: oThis.requestParams.tokenId });

    // If row was updated successfully.
    if (+tokenModelResp.affectedRows === 1) {
      logger.win('*** Economy Setup Done ***');

      // Mark success in workflows table.
      return oThis.handleSuccess();
    } else {
      return Promise.resolve(responseHelper.successWithData({ taskStatus: workflowStepConstants.taskFailed }));
    }
  }

  /**
   * Mark token deployment as failed in tokens table.
   *
   * @return {Promise<any>}
   */
  async _tokenDeploymentFailed() {
    const oThis = this;

    // Update status of token deployment as deploymentFailed in tokens table.
    let tokenModelResp = await new TokenModel()
      .update({
        status: new TokenModel().invertedStatuses[tokenConstants.deploymentFailed]
      })
      .where({
        client_id: oThis.clientId,
        status: new TokenModel().invertedStatuses[tokenConstants.deploymentStarted]
      })
      .fire();

    // Clear token cache.
    await TokenModel.flushCache({ clientId: oThis.clientId, tokenId: oThis.requestParams.tokenId });

    // If row was updated successfully.
    if (+tokenModelResp.affectedRows === 1) {
      logger.error('*** Economy Setup Failed ***');

      // Mark failed in workflows table.
      await oThis.handleFailure();
    } else {
      return Promise.resolve(responseHelper.successWithData({ taskStatus: workflowStepConstants.taskFailed }));
    }
  }

  /**
   * Get next step configs.
   *
   * @param nextStep
   *
   * @return {*}
   */
  getNextStepConfigs(nextStep) {
    return economySetupConfig[nextStep];
  }

  /**
   * Add functionality here that subclass should ensure should happen when error in catch appears.
   *
   * @return {Promise<void>}
   */
  async ensureOnCatch() {
    const oThis = this;

    // Update token deployment status as deploymentFailed.
    await new TokenModel()
      .update({
        status: new TokenModel().invertedStatuses[tokenConstants.deploymentFailed]
      })
      .where({
        client_id: oThis.clientId,
        status: new TokenModel().invertedStatuses[tokenConstants.deploymentStarted]
      })
      .fire();

    // Clear token cache.
    await TokenModel.flushCache({ clientId: oThis.clientId, tokenId: oThis.requestParams.tokenId });

    return Promise.resolve();
  }

  /**
   * SHA Hash to uniquely identify workflow, to avoid same commits
   *
   * @returns {String}
   *
   * @private
   */
  _uniqueWorkflowHash() {
    const oThis = this;

    let uniqueStr = oThis.requestParams.tokenId + '_';
    uniqueStr += oThis.requestParams.auxChainId + '_';
    uniqueStr += oThis.requestParams.originChainId;

    return util.createSha256Digest(uniqueStr);
  }
}

module.exports = EconomySetupRouter;
