const rootPrefix = '../..',
  util = require(rootPrefix + '/lib/util');

/**
 * Class for redemption url helper.
 *
 * @class UrlHelper
 */
class UrlHelper {
  /**
   * Create short url given long url.
   *
   * @param {string} longUrl eg. //https://s3.amazonaws.com/uassets.stagingpepo.com/pepo-staging1000/ua/rsku/images/1-b0fb183f452e288c42a6d2b18788551f-original.jpeg
   *
   * @returns {string}
   */
  longToShortUrl(longUrl) {
    const oThis = this;

    const urlTemplate = longUrl.replace(oThis.redemptionUrlPrefix, oThis.shortRedemptionUrlPrefix);

    const splitElementsArray = urlTemplate.split('-'),
      sizeExtension = splitElementsArray[splitElementsArray.length - 1],
      sizeExtensionArray = sizeExtension.split('.'),
      fileExtension = sizeExtensionArray[sizeExtensionArray.length - 1];

    splitElementsArray[splitElementsArray.length - 1] = oThis.fileNameShortSizeSuffix + '.' + fileExtension;

    return splitElementsArray.join('-');
  }

  /**
   * Create long url given short url.
   *
   * @param {string} shortUrl
   * @param {string} size
   *
   * @returns {string}
   */
  shortToLongUrl(shortUrl, size) {
    const oThis = this;
    shortUrl = shortUrl.replace(oThis.shortRedemptionUrlPrefix, oThis.redemptionUrlPrefix);

    return shortUrl.replace(oThis.fileNameShortSizeSuffix, size);
  }

  /**
   * Create short resolutions.
   *
   * @param {object} imageMap
   *  eg. imageMap
   *  {
   *    '144w': {url: '', size: , width: height:},
   *    '288w': {url: '', size:, width: height:}
   *  }
   * @returns {object}
   */
  createShortResolutions(imageMap) {
    const oThis = this,
      shortResolutionsMap = {};

    for (const imageSize in imageMap) {
      const shortImageSize = oThis.imageSizesLongNameToShortNameMap[imageSize];

      if (!shortImageSize) {
        throw new Error('Image size is not available.');
      }

      shortResolutionsMap[shortImageSize] = {
        [oThis.sizeShortName]: imageMap[imageSize].size,
        [oThis.widthShortName]: imageMap[imageSize].width,
        [oThis.heightShortName]: imageMap[imageSize].height
      };
    }

    return shortResolutionsMap;
  }

  /**
   * Create long resolutions.
   *
   * @param {object} imageMap
   *  eg. imageMap
   *  {
   *    '144w': {url: '', size: , width: height:},
   *    '288w': {url: '', size:, width: height:}
   *  }
   * @returns {object}
   */
  createLongResolutions(imageMap) {
    const oThis = this,
      longResolutionsMap = {};

    for (const purpose in imageMap) {
      longResolutionsMap[purpose] = {};

      const imageMapForPurpose = imageMap[purpose],
        resolutions = imageMapForPurpose[oThis.resolutionsShortName],
        urlTemplate = imageMapForPurpose[oThis.urlTemplateShortName];

      for (const resolution in resolutions) {
        const resolutionLongName = oThis.imageSizesShortNameToLongNameMap[resolution];
        longResolutionsMap[purpose][resolutionLongName] = {
          url: oThis.shortToLongUrl(urlTemplate, resolutionLongName),
          size: imageMapForPurpose[oThis.resolutionsShortName][resolution][oThis.sizeShortName],
          width: imageMapForPurpose[oThis.resolutionsShortName][resolution][oThis.widthShortName],
          height: imageMapForPurpose[oThis.resolutionsShortName][resolution][oThis.heightShortName]
        };
      }
    }

    return longResolutionsMap;
  }

  // TODO: This needs to be changed according to given s3 url.
  get redemptionUrlPrefix() {
    return 'https://dxwfxs8b4lg24.cloudfront.net/ost-platform/rskus/';
  }

  get shortRedemptionUrlPrefix() {
    return '{{s3_ru}}';
  }

  get fileNameShortSizeSuffix() {
    return '{{s}}';
  }

  get imageSizesLongNameToShortNameMap() {
    return {
      original: 'o',
      '144w': '144w'
    };
  }

  /**
   * Mapping of long column names to their short names.
   *
   * @returns {object|*}
   */
  get imageSizesShortNameToLongNameMap() {
    const oThis = this;

    return util.invert(oThis.imageSizesLongNameToShortNameMap);
  }

  get availablePurposeForImages() {
    const oThis = this;

    return {
      [oThis.coverPurposeForImage]: 1,
      [oThis.detailPagePurposeForImage]: 1
    };
  }

  // Square image.
  get coverPurposeForImage() {
    return 'cover';
  }

  // Details page rectangular image.
  get detailPagePurposeForImage() {
    return 'detail';
  }

  get sizeShortName() {
    return 's';
  }

  get widthShortName() {
    return 'w';
  }

  get heightShortName() {
    return 'h';
  }

  get urlTemplateShortName() {
    return 'ut';
  }

  get resolutionsShortName() {
    return 'rs';
  }
}

module.exports = new UrlHelper();
