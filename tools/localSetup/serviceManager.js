'use strict';
/**
 * Manage SAAS Api services.
 *
 * @module tools/localSetup/serviceManager
 */
const shellAsyncCmd = require('node-cmd');

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  setupHelper = require(rootPrefix + '/tools/localSetup/helper'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  localChainConfig = require(rootPrefix + '/tools/localSetup/config'),
  fileManager = require(rootPrefix + '/tools/localSetup/fileManager'),
  ChainAddressModel = require(rootPrefix + '/app/models/mysql/ChainAddress'),
  chainAddressConst = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId');

// Declare variables.
const sealerPassphraseFile = 'sealer-passphrase',
  sealerPassword = 'testtest';

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
    const cmd =
      "ps -ef | grep 'openst-setup' | grep 'origin-" +
      chainId.toString() +
      "' |  grep -v grep | awk '{print $2}' | xargs kill";
    shellAsyncCmd.run(cmd);
    logger.info('* Stopped running origin geths');
  }

  /**
   * Stop Utility Geth node
   *
   * @param {String/Number} chainId
   */
  stopAuxGeth(chainId) {
    const cmd =
      "ps -ef | grep 'openst-setup' | grep 'aux-" +
      chainId.toString() +
      "' |  grep -v grep | awk '{print $2}' | xargs kill";
    shellAsyncCmd.run(cmd);
    logger.info('* Stopped all running auxiliary geths');
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
      networkId =
        chainType === coreConstants.auxChainKind
          ? localChainConfig.chains.aux.networkId.value
          : localChainConfig.chains.origin.networkId.value,
      chainPort =
        chainType === coreConstants.auxChainKind
          ? localChainConfig.chains.aux.gethPort.value
          : localChainConfig.chains.origin.gethPort.value,
      zeroGasPrice = contractConstants.zeroGasPrice,
      gasLimit = { aux: coreConstants.OST_AUX_GAS_LIMIT, origin: coreConstants.OST_ORIGIN_GAS_LIMIT },
      chainFolder = setupHelper.gethFolderFor(chainType, chainId),
      chainTypeString = chainType === 'aux' ? 'auxGeth' : 'originGeth',
      rpcProviderHostPort = chainConfigStrategy[chainTypeString].readOnly.rpcProvider.replace('http://', '').split(':'),
      rpcHost = rpcProviderHostPort[0],
      rpcPort = rpcProviderHostPort[1],
      wsProviderHostPort = chainConfigStrategy[chainTypeString].readOnly.wsProvider.replace('ws://', '').split(':'),
      wsHost = wsProviderHostPort[0],
      wsPort = wsProviderHostPort[1];

    let gasPrice;

    if (chainType === 'aux') {
      if (purpose === 'deployment') {
        fileManager.mkdir(setupHelper.logsFolder() + '/' + chainType + '-' + chainId.toString());
        gasPrice = contractConstants.zeroGasPrice;
      } else {
        gasPrice = contractConstants.auxChainGasPrice;
      }
    } else {
      gasPrice = contractConstants.defaultOriginChainGasPrice;
    }

    let sealerAddress = await new ChainAddressModel().fetchAddress({
      chainId: chainId,
      kind: chainAddressConst.sealerKind
    });

    // Only one sealer address for local
    const sealerAddr = sealerAddress.data.addresses[0];

    // Creating password file in a temp location
    fileManager.touch(chainFolder + '/' + sealerPassphraseFile, sealerPassword);
    fileManager.touch(
      setupHelper.logsFolder() +
        '/' +
        chainType +
        '-' +
        chainId.toString() +
        '/' +
        chainType +
        '-chain-' +
        chainId.toString() +
        '.log'
    );

    return (
      'geth --networkid ' +
      networkId +
      ' --datadir ' +
      setupHelper.setupFolderAbsolutePath() +
      '/' +
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
      " --rpccorsdomain 'null' " + //cors is set to null, for running myEtherWallet on localhost
      ' --etherbase ' +
      sealerAddr +
      ' --mine --minerthreads 1 --targetgaslimit ' +
      gasLimit[chainType] +
      '  --gasprice "' +
      gasPrice +
      '" --unlock ' +
      sealerAddr +
      ' --password ' +
      setupHelper.setupFolderAbsolutePath() +
      '/' +
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
    logger.info('* Starting ' + chainType + '-' + chainId + ' chain.');
    const cmd = await oThis._startGethCommand(chainType, chainId, purpose);
    logger.info(cmd);
    shellAsyncCmd.run(cmd);

    await basicHelper.pauseForMilliSeconds(3 * 1000);
    logger.info('* ' + chainType + '-' + chainId + ' chain is running.');

    let fileName = null,
      binFolderForGeth = setupHelper.binFolder() + '/' + chainType + '-' + chainId.toString();

    if (chainType == 'aux' && purpose == 'deployment') {
      fileManager.mkdir(binFolderForGeth);
      fileName = chainType + '-chain-zeroGas-' + chainId.toString() + '.sh';
    } else {
      fileName = chainType + '-chain-' + chainId.toString() + '.sh';
    }

    // TODO :: add check if the GETH has started generating new blocks.
    let gethFilePath = binFolderForGeth + '/' + fileName;

    fileManager.touch(gethFilePath, '#!/bin/sh');
    fileManager.append(gethFilePath, cmd);
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

module.exports = new ServiceManager();
