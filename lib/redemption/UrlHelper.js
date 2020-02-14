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
   * @param shortUrl
   */
  shortToLongUrl(shortUrl) {
    const oThis = this,
      longUrlsMap = {};

    shortUrl = shortUrl.replace(oThis.shortRedemptionUrlPrefix, oThis.redemptionUrlPrefix);

    for (let size in oThis.imageSizesMap) {
      longUrlsMap[size] = shortUrl.replace(oThis.fileNameShortSizeSuffix, size);
    }

    return longUrlsMap;
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
}

module.exports = new UrlHelper();
