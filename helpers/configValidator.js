/**
 * CRUD for configuration
 * This file will also be used to validate configuration passed.
 *
 * @module helpers/configuration
 */

const rootPrefix = '..',
  basicHelper = require(rootPrefix + '/helpers/basic'),
  configTemplate = require(rootPrefix + '/config/template'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger');

/**
 * Class to validate config strategy.
 *
 * @class ConfigurationHelper
 */
class ConfigurationHelper {
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

    let returnFlag = true;
    const configEntityName = rootLevelEntities[entityName];

    if (!configEntityName || !entitiesMap[configEntityName]) {
      returnFlag = false;
    } else {
      logger.log('configuration[entityName]-----', configuration[entityName]);
      logger.log('entitiesMap[configEntityName]-----', entitiesMap[configEntityName]);

      if (entitiesMap[configEntityName].entityType === 'object') {
        returnFlag = returnFlag && oThis._validateObjectTypeEntity(configEntityName, configuration[entityName]);
      } else if (entitiesMap[configEntityName].entityType === 'array') {
        returnFlag = returnFlag && oThis._validateArrayTypeEntity(configEntityName, configuration[entityName]);
      } else if (entitiesMap[configEntityName].entityType === 'string') {
        const valueCheckNeeded = entitiesMap[configEntityName].valueCheckNeeded;
        if (!oThis._validateStringTypeEntity(configEntityName, configuration[entityName], valueCheckNeeded)) {
          logger.error(`${configEntityName} value should be string at root level`);
          returnFlag = false;
        }
      } else if (entitiesMap[configEntityName].entityType === 'number') {
        if (!oThis._validateNumberTypeEntity(configuration[entityName])) {
          logger.error(`${configEntityName} value should be number at root level`);
          returnFlag = false;
        }
      }
    }

    return returnFlag;
  }

  /**
   * Validate object entity type.
   *
   * @param {string} entityName
   * @param {object} configToValidate
   *
   * @returns {boolean}
   * @private
   */
  _validateObjectTypeEntity(entityName, configToValidate) {
    const oThis = this,
      entitiesMap = configTemplate.entitiesMap;

    let returnFlag = true;

    // Validation if the configToValidate is present and it is an object
    if (!configToValidate || typeof configToValidate !== 'object') {
      logger.error(`${configToValidate} : ${entityName} is either not present or it is not an object.`);
      returnFlag = false;

      return returnFlag;
    }
    for (const secondLevelEntity in entitiesMap[entityName].entitiesPresent) {
      // Eg. secondLevelEntity="engine"
      const secondLevelEntityName = entitiesMap[entityName].entitiesPresent[secondLevelEntity]; // Eg. secondLevelEntityName = "engineEntity"

      if (entitiesMap[secondLevelEntityName].entityType === 'string') {
        const valueCheckNeeded = entitiesMap[secondLevelEntityName].valueCheckNeeded;
        if (
          !oThis._validateStringTypeEntity(secondLevelEntityName, configToValidate[secondLevelEntity], valueCheckNeeded)
        ) {
          logger.error(`${secondLevelEntity} value should be string in ${entityName}`);
          returnFlag = false;
        }
      } else if (entitiesMap[secondLevelEntityName].entityType === 'number') {
        if (!oThis._validateNumberTypeEntity(configToValidate[secondLevelEntity])) {
          logger.error(`${secondLevelEntity} value should be number in ${entityName}`);
          returnFlag = false;
        }
      } else if (entitiesMap[secondLevelEntityName].entityType === 'object') {
        returnFlag =
          returnFlag && oThis._validateObjectTypeEntity(secondLevelEntityName, configToValidate[secondLevelEntity]);
      } else if (entitiesMap[secondLevelEntityName].entityType === 'array') {
        returnFlag =
          returnFlag && oThis._validateArrayTypeEntity(secondLevelEntityName, configToValidate[secondLevelEntity]);
      }
    }

    return returnFlag;
  }

  /**
   * Validate array type entity.
   *
   * @param {string} entityName
   * @param {object} configToValidate
   *
   * @returns {boolean}
   * @private
   */
  _validateArrayTypeEntity(entityName, configToValidate) {
    // Eg. entityName=serversEntity    configToValidate = ["127.0.0.1","127.0.0.2"]
    const oThis = this,
      entitiesMap = configTemplate.entitiesMap;

    let returnFlag = true;

    if (!configToValidate || !(configToValidate instanceof Array)) {
      logger.error(`${entityName} is either not present or it is not an array.`);

      return;
    }

    const nameOfEntitiesPresentInArray = entitiesMap[entityName].entitiesPresent, // Eg. serverEntity
      typeOfEntitiesPresentInArray = entitiesMap[nameOfEntitiesPresentInArray].entityType, // Eg. string
      valueCheckNeeded = entitiesMap[nameOfEntitiesPresentInArray].valueCheckNeeded;

    for (const index in configToValidate) {
      if (typeOfEntitiesPresentInArray === 'string') {
        if (!oThis._validateStringTypeEntity(nameOfEntitiesPresentInArray, configToValidate[index], valueCheckNeeded)) {
          logger.error(`${configToValidate} value should be an array strings in ${entityName}`);
          returnFlag = false;
        }
      } else if (typeOfEntitiesPresentInArray === 'number') {
        if (!oThis._validateNumberTypeEntity(configToValidate[index])) {
          logger.error(`${configToValidate[index]} value should be an array of numbers in ${entityName}`);
          returnFlag = false;
        }
      } else if (typeOfEntitiesPresentInArray === 'object') {
        returnFlag =
          returnFlag && oThis._validateObjectTypeEntity(nameOfEntitiesPresentInArray, configToValidate[index]); // Eg. entityName=nodeEntity configToValidate[index] = {client:"geth"...}
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
   * @param {string} entityName
   * @param {string} entityValue
   * @param {number} valueCheckNeeded
   *
   * @returns {boolean}
   *
   * @private
   */
  _validateStringTypeEntity(entityName, entityValue, valueCheckNeeded) {
    const oThis = this;
    if (typeof entityValue !== 'string') {
      return false;
    } // If specific value check is needed then valueCheckNeeded parameter should be added in the template and check will be added in _validateValueFor function.

    if (valueCheckNeeded) {
      return oThis._validateValueFor(entityName, entityValue);
    }

    return true;
  }

  /**
   * Validate number type entity.
   *
   * @param {number} value
   *
   * @returns {*|boolean}
   * @private
   */
  _validateNumberTypeEntity(value) {
    return value && typeof value === 'number';
  }

  /**
   * Validate value for entityName.
   *
   * @param {string} entityName
   * @param {string} entityValue
   *
   * @private
   */
  _validateValueFor(entityName, entityValue) {
    switch (entityName) {
      case 'originDdbTablePrefixEntity': {
        if (!basicHelper.isProduction()) {
          return true;
        }

        const oSubEnvPrefix = basicHelper.isMainSubEnvironment() ? 'm_' : 's_';
        const oDdbTablePrefix = 'pd_' + oSubEnvPrefix + 'o_';
        if (oDdbTablePrefix !== entityValue) {
          logger.error('originDdbTablePrefix should be of format', oDdbTablePrefix);

          return false;
        }

        break;
      }
      case 'auxDdbTablePrefixEntity': {
        if (!basicHelper.isProduction()) {
          return true;
        }

        const aSubEnvPrefix = basicHelper.isMainSubEnvironment() ? 'm_' : 's_';
        const aDdbTablePrefix = 'pd_' + aSubEnvPrefix + 'a_';
        if (aDdbTablePrefix !== entityValue) {
          logger.error('auxDdbTablePrefix should be of format', aDdbTablePrefix);

          return false;
        }

        break;
      }
      case 'subEnvDdbTablePrefixEntity': {
        if (!basicHelper.isProduction()) {
          return true;
        }

        const subEnvPrefix = basicHelper.isMainSubEnvironment() ? 'm_' : 's_';
        const subEnvDdbTablePrefix = 'pd_' + subEnvPrefix;
        if (subEnvDdbTablePrefix !== entityValue) {
          logger.error('auxDdbTablePrefix should be of format', subEnvDdbTablePrefix);

          return false;
        }

        break;
      }
    }

    return true;
  }
}

module.exports = new ConfigurationHelper();
