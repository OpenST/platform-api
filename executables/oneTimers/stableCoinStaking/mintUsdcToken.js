/**
 * Executable to mint USDC tokens
 *
 * @module executables/oneTimers/stableCoinStaking/mintUsdcToken
 */
const program = require('commander');

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig');

const OSTBase = require('@ostdotcom/base'),
  InstanceComposer = OSTBase.InstanceComposer;

require(rootPrefix + '/tools/chainSetup/origin/usdcToken/Mint');

program
  .option('--usdcTokenOwnerAddress <usdcTokenOwnerAddress>', 'USDC token owner address')
  .option('--usdcTokenOwnerPrivateKey <usdcTokenOwnerPrivateKey>', 'USDC token owner private key')
  .option('--usdcContractAddress <usdcContractAddress>', 'USDC contract address')
  .option('--usdcToMintInWei <usdcContractAddress>', 'USDC to mint in wei')
  .parse(process.argv);

program.on('--help', function() {
  logger.log('');
  logger.log('  Example:');
  logger.log('');
  logger.log(
    '    node executables/oneTimers/stableCoinStaking/mintUsdcToken.js --usdcTokenOwnerAddress "" --usdcTokenOwnerPrivateKey "" --usdcContractAddress "" --usdcToMintInWei "200000000000000"'
  );
  logger.log('');
  logger.log('');
});

if (
  !program.usdcTokenOwnerAddress ||
  !program.usdcTokenOwnerAddress ||
  !program.usdcContractAddress ||
  !program.usdcToMintInWei
) {
  program.help();
  process.exit(1);
}

/**
 * Class to mint USDC token
 *
 * @class MintUsdcToken
 */
class MintUsdcToken {
  /**
   * Constructor
   *
   * @constructor
   *
   * @params
   * @param {String} usdcTokenOwnerAddress - usdc token owner address
   * @param {String} usdcTokenOwnerPrivateKey - usdc token owner private key
   * @param {String} usdcContractAddress - usdc contract address
   * @param {String} usdcToMintInWei - usdc to mint in wei
   */
  constructor(params) {
    const oThis = this;

    oThis.usdcTokenOwnerAddress = params.usdcTokenOwnerAddress;
    oThis.usdcTokenOwnerPrivateKey = params.usdcTokenOwnerPrivateKey;
    oThis.usdcContractAddress = params.usdcContractAddress;
    oThis.usdcToMintInWei = params.usdcToMintInWei;
  }

  async perform() {
    const oThis = this;

    let chainConfig = await chainConfigProvider.getFor([0]);
    let instanceComposer = new InstanceComposer(chainConfig[0]);

    const MintUsdcToken = instanceComposer.getShadowedClassFor(coreConstants.icNameSpace, 'MintUsdcToken'),
      mintUsdcToken = new MintUsdcToken({
        signerAddress: oThis.usdcTokenOwnerAddress,
        signerKey: oThis.usdcTokenOwnerPrivateKey,
        usdcContractAddress: oThis.usdcContractAddress,
        usdcToMintInWei: oThis.usdcToMintInWei
      });

    const mintUsdcTokenRsp = await mintUsdcToken.perform();

    if (mintUsdcTokenRsp.isSuccess()) {
      return;
    }

    logger.error('USDC token minting failed.');

    return Promise.reject(new Error('USDC token minting failed.'));
  }
}

logger.log('Minting USDC tokens.');

new MintUsdcToken({
  usdcTokenOwnerAddress: program.usdcTokenOwnerAddress,
  usdcTokenOwnerPrivateKey: program.usdcTokenOwnerPrivateKey,
  usdcContractAddress: program.usdcContractAddress,
  usdcToMintInWei: program.usdcToMintInWei
})
  .perform()
  .then(function() {
    console.log('====Successfully minted usdc tokens=====');
    process.exit(0);
  })
  .catch(function(err) {
    console.error(err);
    process.exit(1);
  });
