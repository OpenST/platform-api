const rootPrefix = '../..';

class UrlHelper {
  constructor() {}

  longToShortUrl(longUrl) {}

  shortToLongUrl(shortUrl) {}

  //https://s3.amazonaws.com/uassets.stagingpepo.com/pepo-staging1000/ua/images/2510-b0fb183f452e288c42a6d2b18788551f-original.jpeg
  createUrlTemplate(url) {
    const oThis = this;

    return url.replace(oThis.redemptionUrlPrefix, oThis.shortRedemptionUrlPrefix);
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
}

module.exports = new UrlHelper();
