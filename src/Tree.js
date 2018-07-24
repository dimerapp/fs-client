/*
* fs-client
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

const Dfile = require('@dimerapp/dfile')
const debug = require('debug')('dimer:fsclient')

/**
 * Converts the files tree to an array of Dfile tree
 *
 * @class Tree
 *
 * @param {String} basePath
 * @param {Array} tree
 */
class Tree {
  constructor (basePath, tree) {
    this.basePath = basePath
    this.tree = tree
  }

  /**
   * Process the file via Dfile
   *
   * @method _processFile
   *
   * @param  {String}     filePath
   *
   * @return {dfile}
   */
  async _processFile (filePath) {
    debug('processing file %s', filePath)
    const file = new Dfile(filePath, this.basePath)
    await file.parse()
    return file
  }

  /**
   * Process all files inside a given tree
   *
   * @method process
   *
   * @return {Array}
   */
  process () {
    return Promise.all(this.tree.map(this._processFile.bind(this)))
  }
}

module.exports = Tree
