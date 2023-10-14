const { urlToRequest } = require("loader-utils");
const { js2xml, xml2js } = require("xml-js");
const { createResolve } = require("./util.js");

module.exports = function browserConfigLoader(browserConfigXml) {
  const callback = this.async();

  main(this, browserConfigXml)
    .then((result) => {
      // eslint-disable-next-line promise/no-callback-in-promise
      callback(null, result);

      return;
    })
    .catch((error) => {
      // eslint-disable-next-line promise/no-callback-in-promise
      callback(error);
    });
};

async function main(loader, browserConfigXml) {
  loader.cacheable();
  const resolve = createResolve(loader);

  const browserConfig = xml2js(browserConfigXml);

  const root = browserConfig.elements.find(
    ({ name }) => name === "browserconfig",
  );
  const msapplication =
    root && root.elements.find(({ name }) => name === "msapplication");
  const tile =
    msapplication && msapplication.elements.find(({ name }) => name === "tile");
  const tiles = tile
    ? tile.elements.filter(({ attributes: { src } = {} }) => Boolean(src))
    : [];

  await Promise.all(tiles.map((tile) => resolveTile(resolve, tile)));

  return js2xml(browserConfig);
}

async function resolveTile(resolve, tile) {
  tile.attributes.src = await resolve(urlToRequest(tile.attributes.src));
}
