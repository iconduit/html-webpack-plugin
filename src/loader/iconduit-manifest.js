const {
  createConsumer,
  createTagDefinitionResolver,
} = require("@iconduit/consumer");
const { urlToRequest } = require("loader-utils");

module.exports = function iconduitManifestLoader(manifestJson) {
  const callback = this.async();

  main(this, manifestJson)
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

async function main(loader, manifestJson) {
  loader.cacheable();
  const { browserConfigLoaderPath, publicPath, webManifestLoaderPath } =
    loader.getOptions();

  const manifest = JSON.parse(manifestJson);
  const consumer = createConsumer(manifest);
  const {
    manifest: { tag },
  } = consumer;

  const definitions = [
    ...(tag.meta || []),
    ...(tag.link || []),
    ...(tag.icon || []),
    ...(tag.appleTouchStartup || []),
    ...(tag.graph || []),
    ...(tag.graphImage || []),
  ];

  let baseUrl = manifest.urls.base;
  if (publicPath.startsWith("/")) baseUrl = baseUrl.replace(/\/$/, "");

  const resolvedDefinitions = JSON.stringify(
    createTagDefinitionResolver({
      ...consumer,

      absoluteDocumentUrl(outputName) {
        let request = urlToRequest(consumer.documentPath(outputName));

        if (outputName === "browserconfigXml") {
          request = `${request}!=!${browserConfigLoaderPath}`;
        }

        if (outputName === "webAppManifest") {
          request = `${request}!=!${webManifestLoaderPath}`;
        }

        return `${baseUrl}%REQUIRE%${request}%REQUIRE_END%`;
      },

      documentUrl(outputName) {
        let request = urlToRequest(consumer.documentPath(outputName));

        if (outputName === "browserconfigXml") {
          request = `${request}!=!${browserConfigLoaderPath}`;
        }

        if (outputName === "webAppManifest") {
          request = `${request}!=!${webManifestLoaderPath}`;
        }

        return `%REQUIRE%${request}%REQUIRE_END%`;
      },

      absoluteImageUrl(outputName, sizeKey) {
        const request = urlToRequest(consumer.imagePath(outputName, sizeKey));

        return `${baseUrl}%REQUIRE%${request}%REQUIRE_END%`;
      },

      imageUrl(outputName, sizeKey) {
        const request = urlToRequest(consumer.imagePath(outputName, sizeKey));

        return `%REQUIRE%${request}%REQUIRE_END%`;
      },
    })(definitions),
  );

  const source = resolvedDefinitions.replace(
    /%REQUIRE%(.*?)%REQUIRE_END%/g,
    (_, request) => {
      return `" + require(${JSON.stringify(request)}) + "`;
    },
  );

  return `__iconduit_result = ${source}`;
}
