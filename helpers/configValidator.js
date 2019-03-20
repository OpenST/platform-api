'use strict';
/**
 * CRUD for configuration
 * This file will also be used to validate configuration passed
 *
 * @module helpers/configuration
 */

const rootPrefix = '..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  basicHelper = require(rootPrefix + '/helpers/basic'),
  configTemplate = require(rootPrefix + '/config/template');

class ConfigurationHelper {
  constructor() {}

  /**
   * This function returns true if the given configuration is as per the template format
   *
   * @param {String} entityName //eg. entityName=cacheEntity, configuration[key] = {"engine":"memcache" ....}
   * @param {Object} configuration
   *
   * @returns {boolean}
   */
  validateConfigStrategy(entityName, configuration) {
    const oThis = this,
      rootLevelEntities = configTemplate.rootLevelEntities,
      entitiesMap = configTemplate.entitiesMap;

    let returnFlag = true,
      configEntityName = rootLevelEntities[entityName];

    if (!configEntityName || !entitiesMap[configEntityName]) {
      returnFlag = false;
    } else {
      logger.log('configuration[entityName]-----', configuration[entityName]);
      logger.log('entitiesMap[configEntityName]-----', entitiesMap[configEntityName]);

      if (entitiesMap[configEntityName]['entityType'] === 'object') {
        returnFlag = returnFlag && oThis._validateObjectTypeEntity(configEntityName, configuration[entityName]);
      } else if (entitiesMap[configEntityName]['entityType'] === 'array') {
        returnFlag = returnFlag && oThis._validateArrayTypeEntity(configEntityName, configuration[entityName]);
      } else if (entitiesMap[configEntityName]['entityType'] === 'string') {
        let valueCheckNeeded = entitiesMap[configEntityName]['valueCheckNeeded'];
        if (!oThis._validateStringTypeEntity(configEntityName, configuration[entityName], valueCheckNeeded)) {
          logger.error(`${key} value should be string at root level`);
          returnFlag = false;
        }
      } else if (entitiesMap[configEntityName]['entityType'] === 'number') {
        if (!oThis._validateNumberTypeEntity(configuration[entityName])) {
          logger.error(`${key} value should be number at root level`);
          returnFlag = false;
        }
      }
    }

    return returnFlag;
  }

  _validateDdbTablePrefix() {}

  /**
   *
   * @param entityName
   * @param configToValidate
   * @returns {boolean}
   * @private
   */
  _validateObjectTypeEntity(entityName, configToValidate) {
    const oThis = this,
      entitiesMap = configTemplate.entitiesMap;

    let returnFlag = true;

    //validation if the configToValidate is present and it is an object
    if (!configToValidate || typeof configToValidate !== 'object') {
      logger.error(`${configToValidate} : ${entityName} is either not present or it is not an object.`);
      returnFlag = false;
      return returnFlag;
    }
    for (let secondLevelEntity in entitiesMap[entityName]['entitiesPresent']) {
      //eg. secondLevelEntity="engine"
      let secondLevelEntityName = entitiesMap[entityName]['entitiesPresent'][secondLevelEntity]; //eg. secondLevelEntityName = "engineEntity"

      if (entitiesMap[secondLevelEntityName]['entityType'] === 'string') {
        let valueCheckNeeded = entitiesMap[secondLevelEntityName]['valueCheckNeeded'];
        if (
          !oThis._validateStringTypeEntity(secondLevelEntityName, configToValidate[secondLevelEntity], valueCheckNeeded)
        ) {
          logger.error(`${secondLevelEntity} value should be string in ${entityName}`);
          returnFlag = false;
        }
      } else if (entitiesMap[secondLevelEntityName]['entityType'] === 'number') {
        if (!oThis._validateNumberTypeEntity(configToValidate[secondLevelEntity])) {
          logger.error(`${secondLevelEntity} value should be number in ${entityName}`);
          returnFlag = false;
        }
      } else if (entitiesMap[secondLevelEntityName]['entityType'] === 'object') {
        returnFlag =
          returnFlag && oThis._validateObjectTypeEntity(secondLevelEntityName, configToValidate[secondLevelEntity]);
      } else if (entitiesMap[secondLevelEntityName]['entityType'] === 'array') {
        returnFlag =
          returnFlag && oThis._validateArrayTypeEntity(secondLevelEntityName, configToValidate[secondLevelEntity]);
      }
    }
    return returnFlag;
  }

  /**
   *
   * @param entityName
   * @param configToValidate
   * @returns {boolean}
   * @private
   */
  _validateArrayTypeEntity(entityName, configToValidate) {
    //eg. entityName=serversEntity    configToValidate = ["127.0.0.1","127.0.0.2"]
    const oThis = this,
      entitiesMap = configTemplate.entitiesMap;

    let returnFlag = true;

    if (!configToValidate || !(configToValidate instanceof Array)) {
      logger.error(`${entityName} is either not present or it is not an array.`);
      return;
    }

    let arrayEntityType = entitiesMap[entityName]['entityType'], //eg. array
      nameOfEntitiesPresentInArray = entitiesMap[entityName]['entitiesPresent'], // eg. serverEntity
      typeOfEntitiesPresentInArray = entitiesMap[nameOfEntitiesPresentInArray]['entityType'], //eg. string
      valueCheckNeeded = entitiesMap[nameOfEntitiesPresentInArray]['valueCheckNeeded'];

    for (let index in configToValidate) {
      if (typeOfEntitiesPresentInArray === 'string') {
        if (!oThis._validateStringTypeEntity(nameOfEntitiesPresentInArray, configToValidate[index], valueCheckNeeded)) {
          logger.error(`${configToValidate} value should be an array strings in ${entityName}`);
          returnFlag = false;
        }
      } else if (typeOfEntitiesPresentInArray === 'number') {
        if (!oThis._validateNumberTypeEntity(configToValidate[index])) {
          logger.error(`${secondLevelEntity} value should be an array of numbers in ${entityName}`);
          returnFlag = false;
        }
      } else if (typeOfEntitiesPresentInArray === 'object') {
        returnFlag =
          returnFlag && oThis._validateObjectTypeEntity(nameOfEntitiesPresentInArray, configToValidate[index]); //eg. entityName=nodeEntity configToValidate[index] = {client:"geth"...}
      } else if (typeOfEntitiesPresentInArray === 'array') {
        returnFlag =
          returnFlag && oThis._validateArrayTypeEntity(nameOfEntitiesPresentInArray, configToValidate[index]);
      }
    }
    return returnFlag;
  }

  /**
   * Check value type and if required value content also.
   *
   * @param entityName {string}
   * @param entityValue {string}
   * @param valueCheckNeeded {number}
   *
   * @returns {boolean}
   *
   * @private
   */
  _validateStringTypeEntity(entityName, entityValue, valueCheckNeeded) {
    const oThis = this;
    if (typeof entityValue !== 'string') return false; //If specific value check is needed then valueCheckNeeded parameter should be added in the template and check will be added in _validateValueFor function.

    if (valueCheckNeeded) {
      return oThis._validateValueFor(entityName, entityValue);
    }
    return true;
  }

  /**
   *
   * @param value
   * @returns {*|boolean}
   * @private
   */
  _validateNumberTypeEntity(value) {
    return value && typeof value === 'number';
  }

  /**
   *
   * @param entityName
   * @param entityValue
   *
   * @private
   */
  _validateValueFor(entityName, entityValue) {
    switch (entityName) {
      case 'originDdbTablePrefixEntity':
        if (!basicHelper.isProduction()) {
          return true;
        }

        let oSubEnvPrefix = basicHelper.isMainSubEnvironment() ? 'mn_' : 'tn_';
        let oDdbTablePrefix = coreConstants.environmentShort + '_' + oSubEnvPrefix;
        if (oDdbTablePrefix !== entityValue) {
          logger.error('originDdbTablePrefix should be of format', oDdbTablePrefix);
          return false;
        }

        break;

      case 'auxDdbTablePrefixEntity':
        if (!basicHelper.isProduction()) {
          return true;
        }

        let aSubEnvPrefix = basicHelper.isMainSubEnvironment() ? 'ma_' : 'sb_';
        let aDdbTablePrefix = coreConstants.environmentShort + '_' + aSubEnvPrefix;
        if (aDdbTablePrefix !== entityValue) {
          logger.error('auxDdbTablePrefix should be of format', aDdbTablePrefix);
          return false;
        }

        break;

      case 'subEnvDdbTablePrefixEntity':
        if (!basicHelper.isProduction()) {
          return true;
        }

        let SubEnvPrefix = basicHelper.isMainSubEnvironment() ? 'm_' : 's_';
        let subEnvDdbTablePrefix = coreConstants.environmentShort + '_' + SubEnvPrefix;
        if (subEnvDdbTablePrefix !== entityValue) {
          logger.error('auxDdbTablePrefix should be of format', subEnvDdbTablePrefix);
          return false;
        }

        break;
    }

    return true;
  }
}

module.exports = new ConfigurationHelper();
