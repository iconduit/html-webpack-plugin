const {resolve, relative} = require('path')

const HtmlPlugin = require('html-webpack-plugin')
const {validate} = require('schema-utils')
const {renderTag} = require('@iconduit/consumer')

const optionsSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://iconduit.github.io/schema/webpack-html-plugin.schema.json',
  title: 'Iconduit Webpack HTML plugin options',
  description: 'The options for an instance of the Iconduit Webpack HTML plugin',
  type: 'object',
  additionalProperties: false,
  required: ['manifestPath'],
  properties: {
    chunkName: {
      description: 'The chunk name to use',
      type: 'string',
    },
    htmlPlugin: {
      description: 'The instance of html-webpack-plugin to add assets to',
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
  validate(optionsSchema, options, {
    baseDataPath: 'options',
    name: 'IconduitWebpackHtmlPlugin',
  })

  const {manifestPath} = options

  const browserConfigLoaderPath = require.resolve('./loader/browser-config.js')
  const iconduitManifestLoaderPath = require.resolve('./loader/iconduit-manifest.js')
  const webManifestLoaderPath = require.resolve('./loader/web-manifest.js')

  const {
    chunkName = 'iconduit-webpack-plugin',
    htmlPlugin,
  } = options

  this.apply = compiler => {
    const {context, webpack} = compiler
    const {Compilation, EntryPlugin} = webpack
    const {PROCESS_ASSETS_STAGE_OPTIMIZE} = Compilation
    const childCompilerName = buildChildCompilerName(context, chunkName, manifestPath)
    let result

    compiler.hooks.make.tapPromise(PLUGIN_NAME, handleMake)

    async function handleMake (compilation) {
      if (HtmlPlugin.getHooks) {
        HtmlPlugin.getHooks(compilation).alterAssetTagGroups.tapPromise(PLUGIN_NAME, handleAlterAssetTagGroups)
      } else {
        throw new Error('Unable to hook into html-webpack-plugin')
      }

      const {outputOptions: {publicPath: optionsPublicPath}} = compilation
      const publicPath = optionsPublicPath === 'auto' ? '' : optionsPublicPath
      const outputOptions = {filename: '[name]', publicPath}

      const childCompiler = compilation.createChildCompiler(childCompilerName, outputOptions)
      childCompiler.context = context

      const iconduitManifestLoaderQuery = JSON.stringify({browserConfigLoaderPath, publicPath, webManifestLoaderPath})
      const loadIconduitManifest = new EntryPlugin(
        context,
        `!!${iconduitManifestLoaderPath}?${iconduitManifestLoaderQuery}!${manifestPath}`,
        chunkName,
      )
      loadIconduitManifest.apply(childCompiler)

      const [entries, childCompilation] = await new Promise((resolve, reject) => {
        childCompiler.runAsChild((error, ...args) => {
          error ? reject(error) : resolve(args)
        })
      })

      const outputName = compilation.hooks.assetPath.call(outputOptions.filename, {
        hash: childCompilation.hash,
        chunk: entries[0],
      })

      compilation.hooks.processAssets.tap(
        {name: PLUGIN_NAME, stage: PROCESS_ASSETS_STAGE_OPTIMIZE},
        assets => {
          delete assets[outputName]
        },
      )

      if (childCompilation.errors.length > 0) {
        const errorDetails = childCompilation.errors
          .map(({message, error}) => message + (error ? `:\n${error}` : ''))
          .join('\n')

        throw new Error(`Child compilation failed:\n${errorDetails}`)
      }

      const source = childCompilation.assets[outputName].source()
      const evalSource = new Function(`let __iconduit_result; ${source}; return __iconduit_result`) // eslint-disable-line no-new-func

      result = evalSource()
    }

    async function handleAlterAssetTagGroups (data) {
      const {headTags, plugin} = data

      if (htmlPlugin && plugin !== htmlPlugin) return data

      headTags.push(...result.map(translateTag))

      return data
    }
  }
}

function buildChildCompilerName (context, chunkName, manifestPath) {
  if (chunkName) return `IconduitWebpackHtmlPlugin for chunk ${chunkName}`

  const absolutePath = resolve(context, manifestPath)
  const relativePath = relative(context, absolutePath)
  const shortestPath = absolutePath.length < relativePath.length ? absolutePath : relativePath

  return `IconduitWebpackHtmlPlugin for manifest ${JSON.stringify(shortestPath)}`
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
    tagName: tag,
    voidTag: isSelfClosing,
  }
}
