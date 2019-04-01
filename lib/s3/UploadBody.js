'use strict';

/**
 * This service upload body to S3 bucket
 *
 * @module lib/s3/UploadBody
 */
const AWS = require('aws-sdk');

const rootPrefix = '../..',
  coreConstants = require(rootPrefix + '/config/coreConstants');

// Create S3 Object
const AWSS3 = new AWS.S3({
  accessKeyId: coreConstants.S3_AWS_ACCESS_KEY,
  secretAccessKey: coreConstants.S3_AWS_SECRET_KEY,
  region: coreConstants.S3_AWS_REGION
});

class UploadBody {
  /**
   * Constructor
   *
   * @param {Object} params
   * @param {String} params.bucket - S3 bucket
   * @param {String} params.filePath - S3 path and filename
   * @param {String} params.body - file content
   * @param {String} params.contentType - file content type
   * @param {String} [params.acl] - file s3 acl
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.bucket = params.bucket; // coreConstants.S3_ANALYTICS_BUCKET
    oThis.key = params.filePath; // coreConstants.S3_ANALYTICS_GRAPH_FOLDER + '/users.json'
    oThis.acl = params.acl || 'private';

    oThis.body = params.body; // JSON.stringify({a:1,b:2})
    oThis.contentType = params.contentType; // "application/json"
  }

  /**
   * perform
   *
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return AWSS3.putObject({
      Bucket: oThis.bucket,
      Key: oThis.key,
      ACL: oThis.acl,
      Body: oThis.body,
      ContentType: oThis.contentType
    }).promise();
  }
}

module.exports = UploadBody;
