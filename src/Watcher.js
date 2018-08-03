/*
* fs-client
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

const chokidar = require('chokidar')
const debug = require('debug')('dimer:watcher')

/**
 * Opinionated watcher for dimer versions and dimer.json file.
 *
 * @class Watcher
 *
 * @param {String} configFilePath
 * @param {Array} locations
 * @param {Object} options
 */
class Watcher {
  constructor (configFilePath, locations, { onChange, ignoreEvent, getEventData }) {
    this.configFilePath = configFilePath
    this.onChange = onChange
    this.ignoreEvent = ignoreEvent
    this.getEventData = getEventData
    this.locations = locations.concat([configFilePath])
  }

  /**
   * Initiate the watcher
   *
   * @method hook
   *
   * @return {void}
   */
  hook () {
    debug('watching locations %o', this.locations)

    this.chokidar = chokidar.watch(this.locations, {
      persistent: true,
      usePolling: false,
      cwd: null,
      ignoreInitial: true,
      awaitWriteFinish: false
    }).on('all', this.listener.bind(this))
  }

  /**
   * Add new locations to the watchers lists
   *
   * @method watch
   *
   * @param  {String} location
   *
   * @return {void}
   */
  watch (location) {
    this.chokidar.add(location)
  }

  /**
   * Stop watching a certain directory
   *
   * @method unwatch
   *
   * @param  {String} location
   *
   * @return {void}
   */
  unwatch (location) {
    this.chokidar.unwatch(location)
  }

  /**
   * Close watcher
   *
   * @method close
   *
   * @return {void}
   */
  close () {
    this.chokidar.close()
  }

  /**
   * Listener executed for each event
   *
   * @method listener
   *
   * @param  {String} event
   * @param  {String} path
   *
   * @return {void}
   */
  async listener (event, path) {
    debug('%s: %s', event, path)

    /**
     * If file changed is config file, then prefix the event
     * with `config:`
     */
    if (path === this.configFilePath) {
      this.onChange(`${event}:config`)
      return
    }

    /**
     * Received error, the `path` property will be error object
     */
    if (event === 'error') {
      this.onChange('error', path)
      return
    }

    /**
     * Ignore file when `ignoreFile` method returns true
     */
    if (this.ignoreEvent(event, path)) {
      return
    }

    try {
      const { event: newEvent, data } = await this.getEventData(event, path)
      await this.onChange(newEvent, data)
    } catch (error) {
      try {
        await this.onChange('error', error)
      } catch (err) {
        throw err
      }
    }
  }
}

module.exports = Watcher
