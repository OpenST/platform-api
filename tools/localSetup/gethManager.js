'use strict';
/**
 * Geth Manager
 *
 * @module tools/localSetup/gethManager
 */
const Path = require('path'),
  editJsonFile = require('edit-json-file');

const rootPrefix = '../..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  fileManager = require(rootPrefix + '/tools/localSetup/fileManager'),
  localSetupHelper = require(rootPrefix + '/tools/localSetup/helper'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  StrategyByChainHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress');

// Declare variables.
const hexStartsWith = '0x',
  sealerPassword = 'testtest',
  genesisTemplateLocation = Path.join(__dirname);

/**
 * Class for geth manager
 *
 * @class
 */
class GethManager {
  /**
   * Constructor for geth manager
   *
   * @constructor
   */
  constructor() {}

  /**
   * Generates an address.
   *
   * @param {String} gethPath
   * @param {String} passwordFilePath
   *
   * @returns {*}
   *
   * @private
   */
  _generateAddress(gethPath, passwordFilePath) {
    let addressGenerationResponse = fileManager.exec(
      'geth --datadir ' + gethPath + ' account new --password ' + passwordFilePath
    );
    return addressGenerationResponse.stdout
      .replace('Address: {', hexStartsWith)
      .replace('}', '')
      .trim();
  }

  /**
   * Modify genesis file
   *
   * @param {String} chainType: 'origin' or 'aux'
   * @param {String/Number} chainId
   * @param {String} chainGenesisLocation: genesis file location to be modified
   * @param {Object} allocAddressToAmountMap: {allocAddress: allocAmount}
   * @parms {String} masterInternalFunderAddress: masterInternalFunderAddress
   * @param {String} sealerAddress
   *
   * @return {Boolean}
   *
   * @private
   */
  _modifyGenesisFile(
    chainType,
    chainId,
    chainGenesisLocation,
    sealerAddress,
    masterInternalFunderAddress,
    blockGenerationTime,
    allocAddressToAmountMap
  ) {
    const gasLimitOn = {
      aux: coreConstants.OST_AUX_GAS_LIMIT,
      origin: coreConstants.OST_ORIGIN_GAS_LIMIT
    };

    let allocAddress, allocAmount;
    for (let allocationAddress in allocAddressToAmountMap) {
      allocAddress = allocationAddress;
      allocAmount = basicHelper.convertToLowerUnit(
        allocAddressToAmountMap[allocAddress],
        coreConstants.ETH_CONVERSION_DECIMALS
      );
    }

    const gasLimit = hexStartsWith + gasLimitOn[chainType].toString(16);

    const extraData =
      '0x0000000000000000000000000000000000000000000000000000000000000000' +
      sealerAddress.replace(hexStartsWith, '') +
      '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

    // If the file doesn't exist, the content will be an empty object by default.
    const file = editJsonFile(chainGenesisLocation);

    if (!allocAddressToAmountMap) {
      //if allocate amount is not specified, then allocates 800M by default.
      //we need this step (for setup on local machines) to fund some addresses for origin deployment
      file.set('alloc.' + masterInternalFunderAddress + '.balance', '0x295be96e640669720000000');
    } else {
      // Alloc balance to required address
      file.set('alloc.' + masterInternalFunderAddress + '.balance', basicHelper.convertToHex(allocAmount));
    }

    // Set chainId.
    file.set('config.chainId', parseInt(chainId));

    // Set blockGenerationTime.
    file.set('config.clique.period', parseInt(blockGenerationTime));

    // Set gas limit.
    file.set('gasLimit', gasLimit);

    // Add extra data.
    file.set('extraData', extraData);

    file.save();
    return true;
  }

  /**
   * Initialize geth chain.
   *
   * @param {String} chainDataDir: chain data dir
   * @param {String} chainGenesisLocation: genesis file location
   *
   * @return {Object}
   *
   * @private
   */
  _initChain(chainDataDir, chainGenesisLocation) {
    let cmd = 'geth --datadir "' + chainDataDir + '" init ' + chainGenesisLocation;
    fileManager.exec(cmd);
  }

  /**
   * Initialize chain
   *
   * @param {String} chainType: 'origin' or 'aux'
   * @param {Number/String} chainId
   * @param {Object} allocAddressToAmountMap: {chainOwnerAllocAddress: allocAmount}
   *
   * @return {Promise<void>}
   */
  async initChain(chainType, chainId, allocAddressToAmountMap) {
    const oThis = this,
      chainFolder = localSetupHelper.gethFolderFor(chainType, chainId),
      chainFolderAbsolutePath = localSetupHelper.setupFolderAbsolutePath() + '/' + chainFolder,
      passwordFilePath = Path.join(chainFolder, '/sealer-passphrase'),
      passwordFileAbsolutePath = Path.join(chainFolderAbsolutePath, '/sealer-passphrase');

    // Create chain folder.
    logger.info('* Creating ' + chainType + '-' + chainId + ' folder.');
    fileManager.mkdir(chainFolder);

    // Create password file.
    logger.info('* Creating password file.');
    fileManager.touch(passwordFilePath, sealerPassword);

    const sealerAddress = oThis._generateAddress(chainFolderAbsolutePath, passwordFileAbsolutePath),
      chainGenesisTemplateLocation = genesisTemplateLocation + '/poaGenesisTemplate' + '.json',
      chainGenesisLocation = chainFolderAbsolutePath + '/genesis' + '.json';

    let chainKind = chainType === 'aux' ? coreConstants.auxChainKind : coreConstants.originChainKind,
      chainTypeString = chainType === 'aux' ? 'auxGeth' : 'originGeth';

    logger.info('* Fetch config strategy for chain id: ', chainId);
    let chainConfigStrategy = await oThis.fetchConfig(chainId),
      blockGenerationTime = chainConfigStrategy[chainTypeString]['blockGenerationTime'];

    logger.info('* Fetch master internal funder');
    let masterInternalFunderAddress = await oThis._fetchOriginAddresses();

    logger.debug('masterInternalFunderAddress----', masterInternalFunderAddress);

    // Copy genesis template file in chain folder
    logger.info('* Copying POA genesis template file.');
    fileManager.exec('cp ' + chainGenesisTemplateLocation + ' ' + chainGenesisLocation);

    // Alloc balance in genesis files.
    logger.info('* Modifying ' + chainType + '-' + chainId + ' genesis file.');
    oThis._modifyGenesisFile(
      chainType,
      chainId,
      chainGenesisLocation,
      sealerAddress,
      masterInternalFunderAddress,
      blockGenerationTime,
      allocAddressToAmountMap
    );

    // Alloc balance in genesis files.
    logger.info('* Init ' + chainType + '-' + chainId + ' chain.');
    oThis._initChain(chainFolderAbsolutePath, chainGenesisLocation);

    return { sealerAddress: sealerAddress };
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
   * Fetch required origin addresses
   *
   * @return {Promise}
   *
   * @private
   */
  async _fetchOriginAddresses() {
    const oThis = this;

    // Fetch all addresses associated with origin chain id.
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: 0 }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    if (chainAddressesRsp.isFailure()) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 't_lc_gm_1',
          api_error_identifier: 'something_went_wrong'
        })
      );
    }

    return chainAddressesRsp.data[chainAddressConstants.masterInternalFunderKind].address;
  }
}

module.exports = new GethManager();
