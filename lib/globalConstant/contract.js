'use strict';
/**
 *
 * @module lib/globalConstant/contract
 */
const rootPrefix = '../..';

/**
 * @class
 */
class Contract {
  /**
   * @constructor
   */
  constructor() {}

  // GAS RELATED CONSTANTS START //

  get deploySimpleTokenGas() {
    return 1200000;
  }

  get finalizeSimpleTokenGas() {
    return 50000;
  }

  get setAdminSimpleTokenGas() {
    return 60000;
  }

  get setupOrganizationGas() {
    return 1000000;
  }

  get deployMppLibGas() {
    return 1500000;
  }

  get deployMbLibGas() {
    return 2200000;
  }

  get deployGatewayLibGas() {
    return 1500000;
  }

  get deployStPrimeGas() {
    return 2000000;
  }

  get initializeStPrimeGas() {
    return 60000;
  }

  get deployAnchorGas() {
    return 900000;
  }

  get setCoAnchorGas() {
    return 60000;
  }

  get deployBTGas() {
    return 3200000;
  }

  get deployUBTGas() {
    return 2400000;
  }

  get deployGatewayGas() {
    return 6000000;
  }

  get deployCoGatewayGas() {
    return 5000000;
  }

  get activateGatewayGas() {
    return 120000;
  }

  get setCoGatewayToStPrimeGas() {
    return 70000;
  }

  get setGatewayInBTGas() {
    return 100000;
  }

  get setCoGatewayInUBTGas() {
    return 100000; // 50742
  }

  get deployGatewayComposerGas() {
    return 2200000; // 1512860
  }

  get setInternalActorInUBTGas() {
    return 60000; // 49208
  }

  get transferOstPrimeGas() {
    return 21000;
  }

  get transferOstGas() {
    return 60000;
  }

  get transferEthGas() {
    return 21000;
  }

  get approveOSTGas() {
    return 50000;
  }

  // TODO: To modify, Value as per failing accept stake step without composer whitelist
  get acceptStakeSTGas() {
    return 5000000;
  }

  get stakeSTGas() {
    return 400000;
  }

  get commitStateRootGas() {
    return 100000;
  }

  get proveGatewayOnAuxGas() {
    return 7000000;
  }

  get confirmStakeIntentGas() {
    return 7000000;
  }

  get progressStakeGas() {
    return 200000;
  }

  get progressMintGas() {
    return 200000;
  }

  get deployPriceOracleContractGas() {
    return 650000;
  }

  get setPriceOracleContractOpsAddressGas() {
    return 60000;
  }

  get setPriceOracleContractAdminAddressGas() {
    return 60000;
  }

  get deployTokenRulesGas() {
    return 2300000; // 1539769
  }

  get deployGnosisSafeMultiSigMasterGas() {
    return 7000000; // 5995004
  }

  get deployTokenHolderMasterGas() {
    return 2700000; // 1761013
  }

  get deployUserWalletFactoryGas() {
    return 900000; // 571438
  }

  get addUserInUserWalletGas() {
    return 800000; //503362
  }

  get deployPricerRuleGas() {
    return 2000000; // 1601596
  }

  get registerPricerRuleGas() {
    return 5000000; // 3122090
  }

  get addPriceOracleGas() {
    return 80000; // 54756
  }

  get setAcceptedMarginGas() {
    return 70000; // 47006
  }

  get deployProxyFactoryGas() {
    return 450000; // 356547
  }

  get addCompanyWalletGas() {
    return 1400000; // 896542
  }

  get updatePricePointsGas() {
    return 80000; // 64585
  }

  // GAS RELATED CONSTANTS END //

  // GAS PRICE RELATED CONSTANTS START //

  get zeroGasPrice() {
    return '0x0';
  }

  get defaultOriginChainGasPrice() {
    return process.env.SA_DEFAULT_ORIGIN_GAS_PRICE;
  }

  get auxChainGasPrice() {
    return process.env.SA_DEFAULT_AUX_GAS_PRICE;
  }

  // GAS RELATED CONSTANTS END //

  // miscellaneous CONSTANTS START //

  get zeroValue() {
    return '0x0';
  }

  get bountyForGateway() {
    return 0;
  }

  get bountyForCoGateway() {
    return 0;
  }

  get nullAddress() {
    return '0x0000000000000000000000000000000000000000';
  }

  get zeroBytesData() {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  // miscellaneous CONSTANTS END //

  get organizationExpirationHeight() {
    return 100000000;
  }

  get multiSigRequirement() {
    return '1';
  }

  get requiredPriceOracleDecimals() {
    return 18;
  }

  get ostBaseCurrencyCode() {
    return 'OST';
  }

  get payCurrencyCode() {
    return 'USD';
  }

  get acceptanceMargin() {
    return '5000000000000000000000000';
  }

  get companyTokenHolderSessionCount() {
    return 10;
  }

  get companyTokenHolderSessionSpendingLimit() {
    return '1000000000000000000000'; //1000 BT
  }

  get companyTokenHolderSessionExpirationHeight() {
    return 100000000;
  }

  // miscellaneous CONSTANTS END //
}

module.exports = new Contract();
