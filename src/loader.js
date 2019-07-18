const validateOptions = require('schema-utils')
const {createConsumer, createTagDefinitionResolver} = require('@iconduit/consumer')
const {getOptions, urlToRequest} = require('loader-utils')

const optionsSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://iconduit.github.io/schema/webpack-html-plugin-loader.schema.json',
  title: 'Iconduit Webpack HTML plugin loader options',
  description: "The options for an instance of the Iconduit Webpack HTML plugin's internal loader",
  type: 'object',
  additionalProperties: false,
  required: ['publicPath'],
  properties: {
    publicPath: {
      description: 'The configured Webpack public path',
      type: 'string',
      minLength: 1,
    },
  },
}

module.exports = function iconduitTagObjectLoader (source) {
  const callback = this.async()

  main(this, source).then(
    result => callback(null, result),
    error => callback(error),
  )
}

async function main (loader, source) {
  const options = getOptions(loader)
  validateOptions(optionsSchema, options, {
    baseDataPath: 'options',
    name: 'iconduit-webpack-plugin loader',
  })

  const publicPath = determinePublicPath(options)

  const consumer = createConsumer(JSON.parse(source))
  const {manifest: {tag}} = consumer

  const definitions = [
    ...(tag.meta || []),
    ...(tag.link || []),
    ...(tag.icon || []),
    ...(tag.appleTouchStartup || []),
    ...(tag.graph || []),
    ...(tag.graphImage || []),
  ]

  const {documents, images} = collectAssets(consumer, definitions)
  const urls = [...Object.values(documents), ...Object.values(images)]
  const urlMap = await loadAssets(loader, urls)
  const augmentedConsumer = augmentConsumer(documents, images, publicPath, urlMap, consumer)
  const tags = augmentedConsumer.resolveTagDefinitions(definitions)

  return `module.exports = ${JSON.stringify(tags)}`
}

function collectAssets (consumer, definitions) {
  const documents = {}
  const images = {}

  createTagDefinitionResolver({
    ...consumer,

    absoluteDocumentUrl (outputName) {
      documents[outputName] = consumer.documentUrl(outputName)
    },

    absoluteImageUrl (outputName, sizeKey) {
      images[`${outputName}$${sizeKey}`] = consumer.imageUrl(outputName, sizeKey)
    },

    documentUrl (outputName) {
      documents[outputName] = consumer.documentUrl(outputName)
    },

    imageUrl (outputName, sizeKey) {
      images[`${outputName}$${sizeKey}`] = consumer.imageUrl(outputName, sizeKey)
    },
  })(definitions)

  return {documents, images}
}

function determinePublicPath (options) {
  const {publicPath} = options

  if (!publicPath) return ''

  return publicPath.endsWith('/') ? publicPath : `${publicPath}/`
}

async function loadAssets (loader, urls) {
  const assets = {}

  await Promise.all(urls.map(async url => {
    assets[url] = await loadAsset(loader, url)
  }))

  return assets
}

function loadAsset (loader, url) {
  return new Promise((resolve, reject) => {
    loader.addDependency(url)
    loader.loadModule(urlToRequest(url), (error, source, sourceMap, module) => {
      error ? reject(error) : resolve(Object.keys(module.buildInfo.assets)[0])
    })
  })
}

function augmentConsumer (documents, images, publicPath, urlMap, consumer) {
  return consumer.transform(manifest => {
    const augmentedDocument = {}
    const augmentedImage = {}

    for (const outputName in manifest.output.document) {
      const definition = manifest.output.document[outputName]

      if (documents[outputName]) {
        augmentedDocument[outputName] = {
          ...definition,

          url: publicPath + urlMap[consumer.documentUrl(outputName)],
        }
      } else {
        augmentedDocument[outputName] = definition
      }
    }

    for (const outputName in manifest.output.image) {
      const sizes = manifest.output.image[outputName]
      const augmentedSizes = {}

      for (const sizeKey in sizes) {
        const definition = sizes[sizeKey]

        if (images[`${outputName}$${sizeKey}`]) {
          augmentedSizes[sizeKey] = {
            ...definition,

            url: publicPath + urlMap[consumer.imageUrl(outputName, sizeKey)],
          }
        } else {
          augmentedSizes[sizeKey] = definition
        }
      }

      augmentedImage[outputName] = augmentedSizes
    }

    return {
      ...manifest,

      output: {
        document: augmentedDocument,
        image: augmentedImage,
      },
    }
  })
}
