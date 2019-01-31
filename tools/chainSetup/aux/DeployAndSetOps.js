'use strict';
/**
 * Deploy ops and set
 *
 * @module tools/chainSetup/origin/DeployGateway
 */
const OpenStOracle = require('@ostdotcom/ost-price-oracle'),
  deployAndSetInOpsHelper = new OpenStOracle.DeployAndSetInOpsHelper();

const rootPrefix = '../../..',
  NonceManager = require(rootPrefix + '/lib/nonce/Manager'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  SignerWeb3Provider = require(rootPrefix + '/lib/providers/signerWeb3'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  conversionRateConstants = require(rootPrefix + '/lib/globalConstant/conversionRates');

/**
 * Class for deploy and set ops contract.
 *
 * @class
 */
class DeployAndSetOps {
  /**
   * Constructor for deploy and set ops contract.
   *
   * @param {Object} params
   * @param {String/Number} params.auxChainId: auxChainId for which origin-gateway needs be deployed.
   * @param {String} params.baseCurrency: base currency for price oracle contract.
   * @param {String} params.quoteCurrency: quote currency for price oracle contract.
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.auxChainId = params['auxChainId'];
    oThis.baseCurrency = params.baseCurrency || conversionRateConstants.OST;
    oThis.quoteCurrency = params.quoteCurrency || conversionRateConstants.USD;

    oThis.configStrategyObj = null;
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
          internal_error_identifier: 't_cs_o_daso_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  async _asyncPerform() {
    const oThis = this;

    await oThis._fetchAddresses();

    await oThis._setWeb3Instance(oThis.deployerAddress);

    await oThis._deployPriceOracleContract();

    await oThis._setWeb3Instance(oThis.priceOracleOpsAddressKindKind);

    await oThis._setOpsContract();
  }

  /**
   * Fetch deployer address
   *
   * @return {Promise<never>}
   *
   * @private
   */
  async _fetchAddresses() {
    const oThis = this;

    let requiredAddressKinds = [chainAddressConst.deployerKind, chainAddressConst.priceOracleOpsAddressKindKind];

    let chainAddressRsp = await new ChainAddressModel().fetchAddresses({
      chainId: oThis.auxChainId,
      kinds: requiredAddressKinds
    });

    oThis.deployerAddress = chainAddressRsp.data.address[chainAddressConst.deployerKind];
    oThis.priceOracleOpsAddressKind = chainAddressRsp.data.address[chainAddressConst.priceOracleOpsAddressKindKind];
  }

  /**
   * Set web3 instance.
   *
   * @params {String} address
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _setWeb3Instance(address) {
    const oThis = this;

    let response = await chainConfigProvider.getFor([oThis.auxChainId]),
      auxChainConfig = response[oThis.auxChainId],
      wsProvider = auxChainConfig.auxGeth.readWrite.wsProviders[0];

    oThis.SignerWeb3Instance = new SignerWeb3Provider(wsProvider, address);
    oThis.web3Instance = await oThis.SignerWeb3Instance.getInstance();
  }

  /**
   * Deploy price oracle contract
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _deployPriceOracleContract() {
    const oThis = this,
      nonceRsp = await oThis._fetchNonce(oThis.deployerAddress);

    let txOptions = {
      gasPrice: contractConstants.zeroGasPrice,
      gas: '579067', // TODO: Add here.
      nonce: nonceRsp.data['nonce'],
      chainId: oThis.auxChainId
    };

    let tx = deployAndSetInOpsHelper.deployRawTx(
      oThis.web3Instance,
      oThis.deployerAddress,
      oThis.baseCurrency,
      oThis.quoteCurrency,
      txOptions
    );

    logger.log('Deploying Price Oracle contract.');

    return tx
      .send(txOptions)
      .on('transactionHash', function(transactionHash) {
        logger.win('\t - Transaction hash:', transactionHash);
      })
      .on('error', function(error) {
        logger.error('\t !! Error !!', error, '\n\t !! ERROR !!\n');
        return Promise.reject(error);
      })
      .on('receipt', function(receipt) {
        logger.win('\t - Receipt:', JSON.stringify(receipt), '\n');
        oThis.contractAddress = receipt.contractAddress;
      })
      .then(async function() {
        logger.log(`\t - Contract Address:`, oThis.contractAddress);
      });
  }

  /**
   * Set price oracle contract address in ops contract.
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _setOpsContract() {
    const oThis = this,
      nonceRsp = await oThis._fetchNonce(oThis.priceOracleOpsAddressKind);

    let txOptions = {
      gasPrice: contractConstants.zeroGasPrice,
      gas: '579067', // TODO: Add here.
      nonce: nonceRsp.data['nonce'],
      chainId: oThis.auxChainId
    };

    let tx = deployAndSetInOpsHelper.setOpsAddressTx(
      oThis.web3Instance,
      oThis.priceOracleOpsAddressKind,
      oThis.contractAddress,
      txOptions
    );

    logger.log('Setting Price Oracle contract address in Ops Contract.');

    return tx
      .send(txOptions)
      .on('transactionHash', function(transactionHash) {
        logger.win('\t - Transaction hash:', transactionHash);
        oThis.transactionHash = transactionHash;
      })
      .on('error', function(error) {
        logger.error('\t !! Error !!', error, '\n\t !! ERROR !!\n');
        return Promise.reject(error);
      })
      .on('receipt', function(receipt) {
        logger.win('\t - Receipt:', JSON.stringify(receipt), '\n');
      })
      .then(async function() {
        logger.win('Price Oracle Contract Address set in Ops contract.');

        // Insert priceOracleContractAddress in chainAddresses table.
        await new ChainAddressModel().insertAddress({
          address: oThis.contractAddress,
          chainId: oThis.auxChainId,
          auxChainId: oThis.auxChainId,
          chainKind: coreConstants.auxChainKind,
          kind: chainAddressConst.priceOracleContractKind,
          status: chainAddressConst.activeStatus
        });
      });
  }

  /**
   * Fetch nonce (calling this method means incrementing nonce in cache, use judiciously)
   *
   * @return {Promise}
   *
   * @private
   */
  async _fetchNonce(address) {
    const oThis = this;
    return new NonceManager({
      address: address,
      chainId: oThis.auxChainId
    }).getNonce();
  }
}

module.exports = DeployAndSetOps;
