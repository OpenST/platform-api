'use strict';
/**
 * Manage SAAS Api services.
 *
 * @module tools/localSetup/serviceManager
 */
const shellAsyncCmd = require('node-cmd');

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  setupHelper = require(rootPrefix + '/tools/localSetup/helper'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  fileManager = require(rootPrefix + '/tools/localSetup/fileManager'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId');

const sealerPassphraseFile = 'sealer-passphrase';

/**
 * Class for service manager
 *
 * @class
 */
class ServiceManager {
  /**
   * Constructor for service manager
   *
   * @constructor
   */
  constructor() {}

  /**
   * Stop origin geth node
   *
   * @param {String/Number} chainId
   */
  stopOriginGeth(chainId) {
    logger.info('* Stopping all running origin geths');
    const cmd =
      "ps -ef | grep 'openst-setup' | grep 'openst-geth-origin-" +
      chainId.toString() +
      "' |  grep -v grep | awk '{print $2}' | xargs kill";
    shellAsyncCmd.run(cmd);
  }

  /**
   * Stop Utility Geth node
   *
   * @param {String/Number} chainId
   */
  stopAuxGeth(chainId) {
    logger.info('* Stopping all running auxiliary geths');
    const cmd =
      "ps -ef | grep 'openst-setup' | grep 'openst-geth-aux-" +
      chainId.toString() +
      "' |  grep -v grep | awk '{print $2}' | xargs kill";
    shellAsyncCmd.run(cmd);
  }

  /**
   * Stop All Geth nodes
   */
  stopAllGeth() {
    logger.info('* Stopping all running geths.');
    const cmd = "ps -ef | grep 'openst-setup' | grep 'geth ' |  grep -v grep | awk '{print $2}' | xargs kill";
    shellAsyncCmd.run(cmd);
  }

  /**
   * Stop executables
   */
  stopAllExecutables() {
    logger.info('* Stopping all running executable');
    const cmd = "ps -ef | grep 'openst-setup' | grep 'executables' |  grep -v grep | awk '{print $2}' | xargs kill";
    shellAsyncCmd.run(cmd);
  }

  /**
   * Stop Utility executables
   *
   * @param {String/Number} chainId
   */
  stopAuxExecutables(chainId) {
    logger.info('* Stopping all running utility executable');
    const cmd =
      "ps -ef | grep 'openst-setup' | grep 'executables' | grep 'aux-chain-" +
      chainId.toString() +
      "' |  grep -v grep | awk '{print $2}' | xargs kill";
    shellAsyncCmd.run(cmd);
  }

  /**
   * Stop all geth nodes and executables
   */
  stopServices() {
    const oThis = this;

    // Stop All geth nodes
    oThis.stopAllGeth();

    // Stop all executables
    oThis.stopAllExecutables();
  }

  /**
   * Stop Origin Chain Services
   *
   * @param {String/Number} chainId
   */
  stopOriginServices(chainId) {
    const oThis = this;

    // Stop geth nodes
    oThis.stopOriginGeth(chainId);
  }

  /**
   * Stop Utility Chain Services
   *
   * @param {String/Number} chainId
   */
  stopUtilityServices(chainId) {
    const oThis = this;

    // Stop Aux chain geth nodes
    oThis.stopAuxGeth(chainId);

    // Stop all executables
    oThis.stopAuxExecutables(chainId);
  }

  /**
   * Fetches config strategy based on chainId.
   *
   * @param {Number} chainId
   *
   * @returns {Promise<void>}
   */
  async fetchConfig(chainId) {
    const strategyByChainHelperObj = new StrategyByChainHelper(chainId),
      configStrategyResp = await strategyByChainHelperObj.getComplete();

    return configStrategyResp.data;
  }

  /**
   * Start geth command
   *
   * @param {String} chainType: 'aux' or 'origin'
   * @param {String/Number} chainId:
   * @param {String} purpose: if mentioned as deployment, geths will start with zero gas. Else in normal mode
   *
   * @return {String}
   * @private
   */
  async _startGethCommand(chainType, chainId, purpose) {
    const oThis = this,
      chainConfigStrategy = await oThis.fetchConfig(chainId),
      networkId = chainId,
      chainPort =
        chainType === chainAddressConst.auxChainKind
          ? chainConfigStrategy.auxConstants.auxChainGethPort
          : chainConfigStrategy.originConstants.originChainGethPort,
      zeroGas = coreConstants.OST_AUX_GAS_PRICE_FOR_DEPLOYMENT,
      gasLimit = { utility: coreConstants.OST_AUX_GAS_LIMIT, value: coreConstants.OST_ORIGIN_GAS_LIMIT },
      gasPrice = purpose === 'deployment' && chainType === 'aux' ? zeroGas : coreConstants.OST_ORIGIN_GAS_PRICE,
      chainFolder = setupHelper.gethFolderFor(chainType, chainId),
      sealerPassword = 'testtest',
      rpcProviderHostPort = chainConfigStrategy[chainType].readOnly.rpcProvider.replace('http://', '').split(':'),
      rpcHost = rpcProviderHostPort[0],
      rpcPort = rpcProviderHostPort[1],
      wsProviderHostPort = chainConfigStrategy[chainType].readOnly.wsProvider.replace('ws://', '').split(':'),
      wsHost = wsProviderHostPort[0],
      wsPort = wsProviderHostPort[1];

    let sealerAddress = await new ChainAddressModel().fetchAddress({
      chainId: chainId,
      chainKind: chainAddressConst.auxChainKind,
      kind: chainAddressConst.sealerKind
    });

    const sealerAddr = sealerAddress.data.address;

    // Creating password file in a temp location
    fileManager.touch(chainFolder + '/' + sealerPassphraseFile, sealerPassword);

    return (
      'geth --networkid ' +
      networkId +
      ' --datadir ' +
      chainFolder +
      ' --port ' +
      chainPort +
      ' --rpc --rpcapi eth,net,web3,personal,txpool --wsapi eth,net,web3,personal,txpool --rpcport ' +
      rpcPort +
      ' --rpcaddr ' +
      rpcHost +
      ' --ws' +
      ' --wsport ' +
      wsPort +
      " --wsorigins '*' --wsaddr " +
      wsHost +
      ' --etherbase ' +
      sealerAddr +
      ' --mine --minerthreads 1 --targetgaslimit ' +
      gasLimit[chainType] +
      '  --gasprice "' +
      gasPrice +
      '" --unlock ' +
      sealerAddr +
      ' --password ' +
      chainFolder +
      '/' +
      sealerPassphraseFile +
      ' 2> ' +
      setupHelper.logsFolderFor(chainType, chainId) +
      '/' +
      chainType +
      '-chain-' +
      chainId.toString() +
      '.log'
    );
  }

  /**
   * Start Geth node
   *
   * @param {String} chainType: 'aux' or 'origin'
   * @param {String/Number} chainId:
   * @param {String} purpose: if mentioned as deployment, geths will start with zero gas. Else in normal mode
   *
   * @returns {Promise<void>}
   */
  async startGeth(chainType, chainId, purpose) {
    const oThis = this;

    // Start Geth
    logger.info('* Starting ' + chainType + '-' + chainId.toString() + ' chain');
    const cmd = await oThis._startGethCommand(chainType, chainId, purpose);
    logger.info(cmd);
    shellAsyncCmd.run(cmd);
  }

  /**
   * Start all services for given purpose
   *
   * @param {String} chainType: 'aux' or 'origin'
   * @param {String/Number} chainId
   * @param {String} purpose: if mentioned as deployment, geths will start with zero gas. Else in normal mode
   *
   * @returns {Promise<void>}
   */
  async startServices(chainType, chainId, purpose) {
    const oThis = this;

    // Start geth nodes
    await oThis.startGeth(chainType, chainId, purpose);
  }
}

module.exports = ServiceManager;
