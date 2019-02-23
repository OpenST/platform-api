'use strict';
/**
 * Manifest of elasticsearch core services.
 *
 * @module elasticsearch/lib/es_services/manifest
 */

const rootPrefix = '../..',
  bulkService = require(rootPrefix + '/lib/es_services/bulk'),
  createService = require(rootPrefix + '/lib/es_services/create'),
  updateService = require(rootPrefix + '/lib/es_services/update'),
  searchService = require(rootPrefix + '/lib/es_services/search'),
  deleteService = require(rootPrefix + '/lib/es_services/delete');

module.exports = {
  BulkService: bulkService,
  CreateService: createService,
  UpdateService: updateService,
  SearchService: searchService,
  DeleteService: deleteService
};
