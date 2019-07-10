const {resolve, relative} = require('path')

const SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin')
const validateOptions = require('schema-utils')
const {renderTag} = require('@iconduit/consumer')

const optionsSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://iconduit.github.io/schema/webpack-html-plugin.schema.json',
  title: 'Iconduit Webpack HTML plugin configuration',
  description: 'The configuration for an instance of the Iconduit Webpack HTML plugin',
  type: 'object',
  additionalProperties: false,
  oneOf: [
    {
      required: ['consumer'],
    },
    {
      required: ['manifestPath'],
    },
  ],
  properties: {
    consumer: {
      description: 'An Iconduit consumer instance',
      type: 'object',
    },
    manifestPath: {
      description: 'A path to the Iconduit manifest',
      type: 'string',
      minLength: 1,
    },
  },
}

const PLUGIN_NAME = 'IconduitWebpackHtmlPlugin'

module.exports = function IconduitWebpackHtmlPlugin (options = {}) {
  validateOptions(optionsSchema, options, 'iconduit-webpack-plugin')

  const manifestPath = determineManifestPath(options)

  this.apply = compiler => {
    const {context} = compiler
    const childCompilerName = buildChildCompilerName(context, manifestPath)
    let outputName, result

    compiler.hooks.make.tapPromise(PLUGIN_NAME, handleMake)
    compiler.hooks.emit.tapPromise(PLUGIN_NAME, handleEmit)
    compiler.hooks.compilation.tap(PLUGIN_NAME, handleCompilation)

    async function handleMake (compilation) {
      const {outputOptions: {publicPath}} = compilation
      const outputOptions = {filename: '[name]', publicPath}

      const childCompiler = compilation.createChildCompiler(childCompilerName, outputOptions)
      childCompiler.context = context

      const loaderPath = require.resolve('./loader.js')
      const loaderQuery = JSON.stringify({publicPath})

      const entryPlugin = new SingleEntryPlugin(
        context,
        `!!${loaderPath}?${loaderQuery}!${manifestPath}`,
        'iconduit-webpack-plugin',
      )
      entryPlugin.apply(childCompiler)

      const [entries, childCompilation] = await new Promise((resolve, reject) => {
        childCompiler.runAsChild((error, ...args) => {
          error ? reject(error) : resolve(args)
        })
      })

      outputName = compilation.mainTemplate.hooks.assetPath.call(outputOptions.filename, {
        hash: childCompilation.hash,
        chunk: entries[0],
      })

      if (childCompilation.errors.length > 0) {
        const errorDetails = childCompilation.errors
          .map(({message, error}) => message + (error ? `:\n${error}` : ''))
          .join('\n')

        throw new Error(`Child compilation failed:\n${errorDetails}`)
      }

      result = eval(childCompilation.assets[outputName].source()) // eslint-disable-line no-eval
      childCompilation.assets = []
    }

    function handleCompilation (compilation) {
      compilation.hooks.htmlWebpackPluginAlterAssetTags.tapPromise(PLUGIN_NAME, handleAssetTags)
    }

    async function handleAssetTags (data) {
      const {head} = data

      head.push(...result.map(translateTag))
    }

    async function handleEmit (compilation) {
      delete compilation.assets[outputName]
    }
  }
}

function determineManifestPath (options) {
  const {consumer, manifestPath} = options

  return manifestPath || consumer.absoluteDocumentPath('iconduitManifest')
}

function buildChildCompilerName (context, manifestPath) {
  const absolutePath = resolve(context, manifestPath)
  const relativePath = relative(context, absolutePath)
  const shortestPath = absolutePath.length < relativePath.length ? absolutePath : relativePath

  return `iconduit-webpack-plugin for ${JSON.stringify(shortestPath)}`
}

function translateTag (data) {
  const {
    attributes,
    children,
    isSelfClosing,
    tag,
  } = data

  return {
    attributes,
    innerHTML: children.map(renderTag).join(''),
    selfClosingTag: isSelfClosing,
    tagName: tag,
  }
}
