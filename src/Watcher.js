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

    locations = locations.concat([configFilePath])
    debug('watching locations %o', locations)

    this.chokidar = chokidar.watch(locations, {
      persistent: true,
      usePolling: false,
      ignoreInitial: true
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
      this.onChange(`config:${event}`)
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
      const data = await this.getEventData(event, path)
      this.onChange(event, data)
    } catch (error) {
      this.onChange('error', error)
    }
  }
}

module.exports = Watcher
