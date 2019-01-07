'use strict';
/**
 * Manage SAAS API setup files/folders
 *
 * @module tools/localSetup/fileManager
 */
const shell = require('shelljs');

const rootPrefix = '../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  localSetupHelper = require(rootPrefix + '/tools/localSetup/helper');

/**
 * Class for File Manager
 *
 * @class
 */
class FileManager {
  /**
   * Constructor for File Manager
   *
   * @constructor
   */
  constructor() {}

  /**
   * Delete file/folder inside openST setup environment
   *
   * @param {String} relativePath: relative file/folder path
   *
   * @returns {Object}
   */
  rm(relativePath) {
    const folder = localSetupHelper.setupFolderAbsolutePath() + '/' + relativePath;

    return localSetupHelper.handleShellResponse(shell.exec('rm -rf ' + folder));
  }

  /**
   * Create folder inside openST setup environment
   *
   * @param {String} relativePath: relative folder path
   *
   * @returns {Object}
   */
  mkdir(relativePath) {
    const folder = localSetupHelper.setupFolderAbsolutePath() + '/' + relativePath;

    console.log('---folder---', folder);

    return localSetupHelper.handleShellResponse(shell.exec('mkdir ' + folder));
  }

  /**
   * Create file inside openST setup environment
   *
   * @param {String} relativePath: relative file path
   * @param {String} fileContent: optional file content
   *
   * @returns {Object}
   */
  touch(relativePath, fileContent) {
    const file = localSetupHelper.setupFolderAbsolutePath() + '/' + relativePath;
    fileContent = fileContent || '';

    return localSetupHelper.handleShellResponse(shell.exec('echo "' + fileContent + '" > ' + file));
  }

  /**
   * Append line at the end of the file
   *
   * @param {String} relativePath: relative file path
   * @param {String} line: line to be appended to file
   *
   * @returns {Object}
   */
  append(relativePath, line) {
    const file = localSetupHelper.setupFolderAbsolutePath() + '/' + relativePath;

    return localSetupHelper.handleShellResponse(shell.exec('echo "' + line + '" >> ' + file));
  }

  /**
   * Copy file from one folder to another inside openST setup environment
   *
   * @param {String} fromFolder: relative from folder
   * @param {String} toFolder: relative to folder
   * @param {String} fileName: file name
   *
   * @returns {Object}
   */
  cp(fromFolder, toFolder, fileName) {
    const src = localSetupHelper.setupFolderAbsolutePath() + '/' + fromFolder + '/' + fileName,
      dest = localSetupHelper.setupFolderAbsolutePath() + '/' + toFolder + '/';

    return localSetupHelper.handleShellResponse(shell.exec('cp -r ' + src + ' ' + dest));
  }

  /**
   * Execute any shell command command
   *
   * @param {String} command: raw command
   *
   * @returns {Object}
   */
  exec(command) {
    return localSetupHelper.handleShellResponse(shell.exec(command));
  }

  /**
   * Fresh setup
   */
  freshSetup() {
    const oThis = this;

    // Remove old setup folder
    logger.info('* Deleting old openST setup folder');
    oThis.rm('');

    // Create new setup folder
    logger.info('* Creating new openST setup folder');
    oThis.mkdir('');

    // Create master GETH folder
    logger.info('* Creating master GETH folder');
    oThis.mkdir(localSetupHelper.masterGethFolder());

    // Creating bin folder
    logger.info('* Creating bin folder');
    oThis.mkdir(localSetupHelper.binFolder());

    // Creating logs folder
    logger.info('* Creating logs folder');
    oThis.mkdir(localSetupHelper.logsFolder());
  }
}

module.exports = new FileManager();
