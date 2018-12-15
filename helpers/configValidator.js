'use strict';
/**
 * CRUD for configuration
 * This file will also be used to validate configuration passed
 *
 * @module helpers/configuration
 */

const rootPrefix = '..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  configTemplate = require(rootPrefix + '/config/template');

class ConfigurationHelper {
  constructor() {}

  /**
   * This function returns true if the given configuration is as per the template format
   *
   * @param {string} entityName //eg. entityName=cacheEntity, configuration[key] = {"engine":"memcache" ....}
   * @param {object} configuration
   *
   * @returns {boolean}
   */
  validateConfigStrategy(entityName, configuration) {
    const oThis = this,
      rootLevelEntities = configTemplate.rootLevelEntities,
      entitiesMap = configTemplate.entitiesMap;

    console.log("entityName-----", entityName);

    let returnFlag = true,
      configEntityName = rootLevelEntities[entityName];

    if(!configEntityName || !entitiesMap[configEntityName]){
      returnFlag = false;
    } else {
      console.log("configuration-----", configuration);
      console.log("configEntityName-----", configEntityName);
      console.log("configuration[entityName]-----", configuration[entityName]);

      console.log("entitiesMap[configEntityName]-----", entitiesMap[configEntityName]);
      if (entitiesMap[configEntityName]['entityType'] === 'object') {
        returnFlag = returnFlag && oThis._validateObjectTypeEntity(configEntityName, configuration[entityName]);
      } else if (entitiesMap[configEntityName]['entityType'] === 'array') {
        returnFlag = returnFlag && oThis._validateArrayTypeEntity(configEntityName, configuration[entityName]);
      } else if (entitiesMap[configEntityName]['entityType'] === 'string') {
        if (!oThis._validateStringTypeEntity(configuration[entityName])) {
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

    console.log("\n\n\nentityName, configToValidate-----", entityName, configToValidate);

    //validation if the configToValidate is present and it is an object
    if (!configToValidate || typeof configToValidate !== 'object') {
      logger.error(`${entityName} is either not present or it is not an object.`);
      returnFlag = false;
      return returnFlag;
    }

    console.log("\n\n\nentitiesMap[entityName]['entitiesPresent']-----", entitiesMap[entityName]['entitiesPresent']);
    for (let secondLevelEntity in entitiesMap[entityName]['entitiesPresent']) {
      //eg. secondLevelEntity="engine"
      let secondLevelEntityName = entitiesMap[entityName]['entitiesPresent'][secondLevelEntity]; //eg. secondLevelEntityName = "engineEntity"


      console.log("\n\n\nsecondLevelEntity-----", secondLevelEntity);
      console.log("\n\n\nconfigToValidate[secondLevelEntity]-----", configToValidate[secondLevelEntity]);
      if (entitiesMap[secondLevelEntityName]['entityType'] === 'string') {
        if (!oThis._validateStringTypeEntity(configToValidate[secondLevelEntity])) {
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
      typeOfEntitiesPresentInArray = entitiesMap[nameOfEntitiesPresentInArray]['entityType']; //eg. string

    for (let index in configToValidate) {
      if (typeOfEntitiesPresentInArray === 'string') {
        if (!oThis._validateStringTypeEntity(configToValidate[index])) {
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
   *
   * @param value
   * @returns {*|boolean}
   * @private
   */
  _validateStringTypeEntity(value) {
    return value && typeof value === 'string';
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
}

module.exports = new ConfigurationHelper();
