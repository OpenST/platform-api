const rootPrefix = '../..';

class UrlHelper {
  constructor() {}

  /**
   * Create short url given long url.
   *
   * @param {string} longUrl eg. //https://s3.amazonaws.com/uassets.stagingpepo.com/pepo-staging1000/ua/images/2510-b0fb183f452e288c42a6d2b18788551f-original.jpeg
   * @returns {string}
   */
  longToShortUrl(longUrl) {
    const oThis = this;

    let urlTemplate = longUrl.replace(oThis.redemptionUrlPrefix, oThis.shortRedemptionUrlPrefix);

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
   * @param {String} shortUrl
   * @param {String} size
   * @returns {Object}
   */
  shortToLongUrl(shortUrl, size) {
    const oThis = this;
    shortUrl = shortUrl.replace(oThis.shortRedemptionUrlPrefix, oThis.redemptionUrlPrefix);
    return shortUrl.replace(oThis.fileNameShortSizeSuffix, size);
  }

  /**
   * Create short resolutions.
   *
   * @param {Object} imageMap
   *  eg. imageMap
   *  {
   *    '144w': {url: '', size: , width: height:},
   *    '288w': {url: '', size:, width: height:}
   *  }
   * @returns {Object}
   */
  createShortResolutions(imageMap) {
    const oThis = this,
      shortResolutionsMap = {};

    for (let imageSize in imageMap) {
      shortResolutionsMap[imageSize] = {
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
   * @param {Object} imageMap
   *  eg. imageMap
   *  {
   *    '144w': {url: '', size: , width: height:},
   *    '288w': {url: '', size:, width: height:}
   *  }
   * @returns {Object}
   */
  createLongResolutions(imageMap) {
    const oThis = this,
      longResolutionsMap = {},
      resolutions = imageMap[oThis.resolutionsShortName],
      urlTemplate = imageMap[oThis.urlTemplateShortName];

    for (let resolution in resolutions) {
      longResolutionsMap[resolution] = {
        url: oThis.shortToLongUrl(urlTemplate, resolution),
        size: imageMap[oThis.resolutionsShortName][resolution][oThis.sizeShortName],
        width: imageMap[oThis.resolutionsShortName][resolution][oThis.widthShortName],
        height: imageMap[oThis.resolutionsShortName][resolution][oThis.heightShortName]
      };
    }

    return longResolutionsMap;
  }

  // TODO: This needs to be changed according to given s3 url.
  get redemptionUrlPrefix() {
    return 'https://s3.amazonaws.com/uassets.stagingpepo.com/pepo-staging1000/ua/images/';
  }

  get shortRedemptionUrlPrefix() {
    return '{{s3_ru}}';
  }

  get fileNameShortSizeSuffix() {
    return '{{s}}';
  }

  get imageSizesMap() {
    return {
      '144w': '144w',
      '288w': '288w'
    };
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
