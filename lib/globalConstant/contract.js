/**
 * Contract constants.
 *
 * @module lib/globalConstant/contract
 */

/**
 * Class for contract constants.
 *
 * @class Contract
 */
class Contract {
  // Gas related constants start.

  get deploySimpleTokenGas() {
    return 1200000;
  }

  get finalizeSimpleTokenGas() {
    return 50000;
  }

  get setAdminSimpleTokenGas() {
    return 60000;
  }

  get deployUsdcTokenGas() {
    return 1200000;
  }

  get initializeUsdcTokenGas() {
    return 60000;
  }

  get configureMinterForUsdcTokenGas() {
    return 50000;
  }

  get mintUsdcTokenGas() {
    return 50000;
  }

  get usdcTokenMintingLimit() {
    return 200000000;
  }

  get usdcTokenAmount() {
    return 200000000;
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
    return 100000; // 72000
  }

  get deployGatewayComposerGas() {
    return 3800000; // 2362545
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
    return 200000; // 88842
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

  get deployDelayedRecoveryModuleMasterCopyGas() {
    return 2700000; // 1754365
  }

  get deployCreateAndAddModulesGas() {
    return 400000; // 246756
  }

  get deployTokenHolderMasterGas() {
    return 2700000; // 1761013
  }

  get deployUserWalletFactoryGas() {
    return 900000; // 571438
  }

  get addUserInUserWalletGas() {
    return 1300000; // 774614, 843940
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

  get addCompanyWalletPerSessionKeyGas() {
    return 105000; // 69646
  }

  get addCompanyWalletBaseGas() {
    return 330000; // 219616
  }

  get updatePricePointsGas() {
    return 80000; // 64585
  }

  get authorizeDeviceGas() {
    return 125000; // 81356
  }

  get authorizeSessionGas() {
    return 174500; // 116341
  }

  get revokeDeviceGas() {
    return 81000; // 53708
  }

  get revokeSessionGas() {
    return 83000; // 55242
  }

  get logoutSessionGas() {
    return 102600; // 68349
  }

  get initiateRecoveryGas() {
    return 250000; // 118904
  }

  get abortRecoveryByOwnerGas() {
    return 100000; // 29650
  }

  get executeRecoveryGas() {
    return 100000; // 46174
  }

  get abortRecoveryByControllerGas() {
    return 60000; // 24817
  }

  get resetRecoveryOwnerGas() {
    return 65000; // 41233
  }

  get executeTokenRuleBaseGas() {
    return 1500000;
  }

  get executeTokenRulePerTransferGas() {
    return 500000;
  }

  get executePricerRuleBaseGas() {
    return 1500000; // TODO: Santhosh add exact values
  }

  get executePricerRulePerTransferGas() {
    return 500000; // TODO: Santhosh add exact values
  }

  // Gas related constants end.

  // Gas price related constants start.

  get zeroGasPrice() {
    return '0x0';
  }

  get defaultOriginChainGasPrice() {
    return process.env.SA_DEFAULT_ORIGIN_GAS_PRICE;
  }

  get auxChainGasPrice() {
    return process.env.SA_DEFAULT_AUX_GAS_PRICE;
  }

  // Gas price related constants end.

  // Miscellaneous constants start.

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

  get organizationExpirationHeight() {
    return 1000000000;
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
    return '1000000000000000000'; // 1 USD in wei
  }

  get companyTokenHolderSessionCount() {
    return 300;
  }

  get companyTokenHolderSessionSpendingLimitInOstWei() {
    return '10000000000000000000000'; // 10000 OST
  }

  get companyTokenHolderSessionExpirationHeight() {
    return 1000000000;
  }

  get maxAllowedTransfersForExecuteRule() {
    return 10;
  }

  // Miscellaneous constants end.
}

module.exports = new Contract();
