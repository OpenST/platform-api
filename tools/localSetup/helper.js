'use strict';
/**
 * Setup Helper
 *
 * @module tools/localSetup/helper
 */
const os = require('os'),
  shell = require('shelljs');

/**
 * Class for setup helper
 *
 * @class
 */
class LocalSetupHelper {
  /**
   * Constructor for setup helper
   *
   * @constructor
   */
  constructor() {}

  // Folder names starts.

  /**
   * Get the openst-setup folder name
   *
   * @return {String}
   */
  setupFolder() {
    return 'openst-setup';
  }

  /**
   * Master GETH folder
   *
   * @return {String}
   */
  masterGethFolder() {
    return 'geth';
  }

  /**
   * Get the bin folder name
   *
   * @return {String}
   */
  binFolder() {
    return 'bin';
  }

  /**
   * Get the logs folder name
   *
   * @return {String}
   */
  logsFolder() {
    return 'logs';
  }

  // Folder names ends.

  // Folder path starts.

  /**
   * Get the setup folder absolute location
   *
   * @return {String}
   */
  setupFolderAbsolutePath() {
    const oThis = this;

    return os.homedir() + '/' + oThis.setupFolder();
  }

  /**
   * Get the geths folder absolute location
   *
   * @return {String}
   */
  gethFolderAbsolutePath() {
    const oThis = this;

    return oThis.setupFolderAbsolutePath() + '/' + oThis.masterGethFolder();
  }

  /**
   * Get the bin folder absolute location
   *
   * @return {String}
   */
  binFolderAbsolutePath() {
    const oThis = this;

    return oThis.setupFolderAbsolutePath() + '/' + oThis.binFolder();
  }

  /**
   * Get the logs folder absolute location
   *
   * @return {String}
   */
  logsFolderAbsolutePath() {
    const oThis = this;

    return oThis.setupFolderAbsolutePath() + '/' + oThis.logsFolder();
  }

  /**
   * Geth folder for a particular chain
   *
   * @param {String} chainType: 'origin' or 'aux'
   * @param {String/Number} chainId
   *
   * @returns {String}
   */
  gethFolderFor(chainType, chainId) {
    const oThis = this;

    return oThis.gethFolderAbsolutePath() + '/' + chainType + '-' + chainId.toString();
  }

  /**
   * Bin folder for a particular chain
   *
   * @param {String} chainType: 'origin' or 'aux'
   * @param {String/Number} chainId
   *
   * @returns {String}
   */
  binFolderFor(chainType, chainId) {
    const oThis = this;

    return oThis.binFolderAbsolutePath() + '/' + chainType + '-' + chainId.toString();
  }

  /**
   * Logs folder for a particular chain
   *
   * @param {String} chainType: 'origin' or 'aux'
   * @param {String/Number} chainId
   *
   * @returns {String}
   */
  logsFolderFor(chainType, chainId) {
    const oThis = this;

    return oThis.logsFolderAbsolutePath() + '/' + chainType + '-' + chainId.toString();
  }

  /**
   * Shared logs folder
   *
   * @returns {String}
   */
  sharedLogsFolder() {
    const oThis = this;

    return oThis.logsFolderAbsolutePath() + '/' + 'shared';
  }

  /**
   * Handle shell response
   *
   * @param {Object} resp - shell response
   */
  handleShellResponse(resp) {
    if (resp.code !== 0) {
      shell.exit(1);
    }

    return resp;
  }

  /**
   * Get list of allowed environments to run setup and token tools
   *
   * @return {Array}
   *
   */
  allowedEnvironment() {
    return ['development', 'test'];
  }

  /**
   * Intercom process identifiers
   *
   * @return {Array}
   */
  intercomProcessIdentifiers() {
    return ['register_branded_token', 'stake_and_mint', 'stake_and_mint_processor', 'stake_hunter'];
  }
}

module.exports = new LocalSetupHelper();
