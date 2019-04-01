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

    oThis.bucket = params.bucket;
    oThis.key = params.filePath;
    oThis.acl = params.acl || 'private';

    oThis.body = params.body;
    oThis.contentType = params.contentType;
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
