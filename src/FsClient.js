/*
* fs-client
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

const klaw = require('klaw')
const { extname, normalize, sep, basename } = require('path')
const fs = require('fs-extra')
const Dfile = require('@dimerapp/dfile')
const ow = require('ow')
const debug = require('debug')('dimer:fsclient')
const utils = require('@dimerapp/utils')

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
  constructor (basePath, config, markdownOptions) {
    this.paths = utils.paths(basePath)
    this.versions = []
    this.markdownExtensions = ['.md', '.markdown', '.mkd', '.mkdown']
    this.watcher = null
    this.markdownOptions = markdownOptions

    config.versions.forEach((version) => (this.addVersion(version)))
  }

  /**
   * Returns a boolean telling if file should be processed
   * as a markup file or not
   *
   * @method _useFile
   *
   * @param  {String}        item
   *
   * @return {Boolean}
   *
   * @private
   */
  _useFile (item) {
    if (item.stats.isDirectory()) {
      return false
    }

    if (basename(item.path).startsWith('_')) {
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

      fs
        .exists(version.absPath)
        .then((exists) => {
          if (!exists) {
            throw new Error(`Directory ${version.location} referenced by ${version.no} doesn't exists`)
          }

          klaw(version.absPath)
            .on('data', (item) => {
              if (this._useFile(item)) {
                filesTree.push(item.path)
              }
            })
            .on('end', () => (resolve({ filesTree, version })))
            .on('error', reject)
        })
        .catch(reject)
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
    const treeInstance = new Tree(version.absPath, filesTree, this.markdownOptions)

    const tree = await treeInstance.process()
    return { version, tree }
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
    if (event === 'unlinkDir') {
      return false
    }

    /**
     * Ignore when file is not markdown or is a draft
     */
    if (!this._useFile({ stats: { isDirectory () { return false } }, path: path })) {
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
    path = normalize(path)

    /**
     * Directory was removed. If directory is the base path
     * to a version, then we will emit `unlink:version`
     * event.
     */
    if (event === 'unlinkDir') {
      const version = this._getVersionForPath(path)
      if (version) {
        this.unwatchVersion(path)
        return { event: 'unlink:version', data: version }
      }
    }

    /**
     * If event is unlink, then we should look for that
     * path version and return the `version` along
     * with file baseName
     */
    if (event === 'unlink') {
      const version = this._getFileVersion(path)
      if (!version) {
        throw new Error(`${path} file is not part of version tree`)
      }

      return {
        event: 'unlink:doc',
        data: { version, baseName: path.replace(`${version.absPath}${sep}`, '') }
      }
    }

    /**
     * If file is changed, then look for the file version and
     * return the dFile instance.
     */
    if (['add', 'change'].indexOf(event) > -1) {
      const version = this._getFileVersion(path)
      if (!version) {
        throw new Error(`${path} file is not part of version tree`)
      }

      const file = new Dfile(path, version.absPath)
      await file.parse()

      return { event: `${event}:doc`, data: { version, file } }
    }

    /**
     * We shouldn't reach here, if we do then return the
     * data as it is
     */
    return { event, data: path }
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
    return this.versions.find((version) => location.startsWith(`${version.absPath}${sep}`))
  }

  /**
   * Returns the version if it's absPath is same as the location
   *
   * @method _getVersionForPath
   *
   * @param  {String}           location
   *
   * @return {Object|Undefined}
   */
  _getVersionForPath (location) {
    return this.versions.find((version) => location === version.absPath)
  }

  /**
   * Add version to the versions list. Also adds `absPath`
   * to the version node.
   *
   * @method addVersion
   *
   * @param  {Object}   version
   *
   * @return {Object}
   */
  addVersion (version) {
    const location = this.paths.versionDocsPath(version.location)
    version = Object.assign({ absPath: location }, version)

    const existingVersion = this.versions.find((v) => v.no === version.no)

    if (!existingVersion) {
      this.versions.push(version)
    } else {
      Object.assign(existingVersion, version)
    }

    return version
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
    this.watcher.unwatch(location)
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

    const addedVersion = this.addVersion(version)
    this.watcher.watch(addedVersion.absPath)
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
   * @param  {Function} onChange
   *
   * @return {void}
   */
  watch (onChange) {
    ow(onChange, ow.function)

    const locations = this.versions.map(({ absPath }) => absPath)

    if (!this.watcher) {
      this.watcher = new Watcher(this.paths.configFile(), locations, {
        onChange,
        ignoreEvent: this._ignoreEvent.bind(this),
        getEventData: this._getEventData.bind(this)
      })
    }

    this.watcher.hook()
  }
}

module.exports = FsClient
