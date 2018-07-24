/*
* fs-client
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

const klaw = require('klaw')
const { extname, join, normalize, sep } = require('path')
const Dfile = require('@dimerapp/dfile')
const ow = require('ow')
const debug = require('debug')('dimer:fsclient')

const Tree = require('./Tree')
const Watcher = require('./Watcher')

/**
 * Fs client reads all the markdown files for all the versions
 * and process them via @dimerapp/dfile.
 *
 * @class FsClient
 *
 * @param {String} basePath
 * @param {Object} config
 */
class FsClient {
  constructor (basePath, config) {
    this.basePath = basePath
    this.versions = config.versions
    this.markdownExtensions = ['.md', '.markdown']
    this.watcher = null
  }

  /**
   * Returns a boolean telling if file is a markdown file
   * or not
   *
   * @method _isMarkdownFile
   *
   * @param  {String}        item
   *
   * @return {Boolean}
   *
   * @private
   */
  _isMarkdownFile (item) {
    if (item.stats.isDirectory()) {
      return false
    }

    const extension = extname(item.path)
    return this.markdownExtensions.indexOf(extension) > -1
  }

  /**
   * Returns a tree of markdown files for a given version
   *
   * @method _versionTree
   *
   * @param  {Object}     version
   *
   * @return {Promise<Object>}
   *
   * @private
   */
  _versionTree (version) {
    return new Promise((resolve, reject) => {
      const filesTree = []

      klaw(join(this.basePath, version.location))
        .on('data', (item) => {
          if (this._isMarkdownFile(item)) {
            filesTree.push(item.path)
          }
        })
        .on('end', () => (resolve({ filesTree, version })))
        .on('error', reject)
    })
  }

  /**
   * Converts the file tree of a version to it's contents tree
   *
   * @method _versionContentTree
   *
   * @param  {Object}            options.version
   * @param  {Array}             options.filesTree
   *
   * @return {Object}
   *
   * @private
   */
  async _versionContentTree ({ version, filesTree }) {
    const treeInstance = new Tree(join(this.basePath, version.location), filesTree)
    const tree = await treeInstance.process()
    return {
      version,
      tree,
      toJSON () {
        return {
          version: this.version,
          tree: this.tree.map((file) => file.toJSON())
        }
      }
    }
  }

  /**
   * Returns a boolean telling watcher whether to ignore
   * the event or not
   *
   * @method _ignoreEvent
   *
   * @param  {String}     event
   * @param  {String}     path
   *
   * @return {Boolean}
   *
   * @private
   */
  _ignoreEvent (event, path) {
    /**
     * Directory was removed
     */
    if (event === 'unlinkDir') {
      this.unwatchVersion(path)
      return true
    }

    /**
     * Ignore when file is not markdown
     */
    if (this.markdownExtensions.indexOf(extname(path)) === -1) {
      return true
    }

    /**
     * Finally ignore when event is not in one of the following events
     */
    return ['add', 'change', 'unlink'].indexOf(event) === -1
  }

  /**
   * Returns the data for the event
   *
   * @method _getEventData
   *
   * @param  {String}      event
   * @param  {String}      path
   *
   * @return {String|Dfile}
   *
   * @private
   */
  async _getEventData (event, path) {
    if (['add', 'change'].indexOf(event) > -1) {
      const version = this._getFileVersion(path)
      if (!version) {
        throw new Error(`${path} file is not part of version tree`)
      }

      const file = new Dfile(path, join(this.basePath, version.location))
      await file.parse()
      return { version, file }
    }

    return path
  }

  /**
   * Returns the version for a given changed file. Chances are
   * this can be undefined
   *
   * @method _getFileVersion
   *
   * @param  {String}        location
   *
   * @return {Object|Undefined}
   *
   * @private
   */
  _getFileVersion (location) {
    location = location.replace(`${this.basePath}${sep}`, '')
    return this.versions.find((version) => location.startsWith(`${version.location}${sep}`))
  }

  /**
   * Generate a files tree for all the versions
   *
   * @method filesTree
   *
   * @return {Array}
   */
  filesTree () {
    return Promise.all(this.versions.map(this._versionTree.bind(this)))
  }

  /**
   * Generates a content tree for all the versions
   *
   * @method tree
   *
   * @return {Array}
   */
  async tree () {
    const filesTree = await this.filesTree()
    const output = await Promise.all(filesTree.map(this._versionContentTree.bind(this)))

    output.toJSON = function () {
      return this.map((node) => node.toJSON())
    }

    return output
  }

  /**
   * Stop watching a given version
   *
   * @method unwatchVersion
   *
   * @param  {String}       location
   *
   * @return {void}
   */
  unwatchVersion (location) {
    ow(location, ow.string.label('location').nonEmpty)

    if (!this.watcher) {
      throw new Error('make sure to start the watcher before calling unwatchVersion')
    }

    debug('attempt to unwatch location %s', location)
    const version = this.versions.find((version) => normalize(location) === join(this.basePath, version.location))

    if (version) {
      debug('unwatch version %s', version.no)
      this.watcher.unwatch(location)
    }
  }

  /**
   * Start watching a new version after the watcher has started
   *
   * @method watchVersion
   *
   * @param  {Object}     version
   *
   * @return {void}
   */
  watchVersion (version) {
    ow(version, ow.object.label('version').hasKeys('no', 'location'))
    ow(version.location, ow.string.label('version.location').nonEmpty)
    ow(version.no, ow.string.label('version.no').nonEmpty)

    if (!this.watcher) {
      throw new Error('make sure to start the watcher before calling watchVersion')
    }

    const existingVersion = this.versions.find((v) => v.no === version.no)

    if (!existingVersion) {
      debug('watching new version %s', version.no)
      this.versions.push(version)
    } else {
      debug('add existing version to watchers list %s', version.no)
      Object.assign(existingVersion, version)
    }

    this.watcher.watch(join(this.basePath, version.location))
  }

  /**
   * Watch for file changes. The callback will be invoked for following events
   * and receives different arguments based on the type of event.
   *
   * | event   | args      |
   * |---------|-----------|
   * | add     | dFile     |
   * | remove  | filePath  |
   * | change  | dFile     |
   *
   * @method watch
   *
   * @param  {String}   configFilePath
   * @param  {Function} onChange
   *
   * @return {void}
   */
  watch (configFilePath, onChange) {
    ow(configFilePath, ow.string.label('configFilePath').nonEmpty)
    ow(onChange, ow.function)

    const locations = this.versions.map(({ location }) => join(this.basePath, location))

    this.watcher = new Watcher(configFilePath, locations, {
      onChange,
      ignoreEvent: this._ignoreEvent.bind(this),
      getEventData: this._getEventData.bind(this)
    })
  }
}

module.exports = FsClient
