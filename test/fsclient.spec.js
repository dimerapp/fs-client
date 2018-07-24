/*
* fs-client
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

const test = require('japa')
const { join } = require('path')
const fs = require('fs-extra')

const FsClient = require('../src/FsClient')
const basePath = join(__dirname, 'app')

class FakeWatcher {
  constructor () {
    this.actions = []
  }

  watch (dir) {
    this.actions.push({ action: 'watch', dir })
  }

  unwatch (dir) {
    this.actions.push({ action: 'unwatch', dir })
  }
}

test.group('FsClient', (group) => {
  group.afterEach(async () => {
    await fs.remove(basePath)
  })

  test('return an array of markdown files', async (assert) => {
    await fs.outputFile(join(basePath, 'docs/master', 'intro.md'), 'Hello')
    await fs.outputFile(join(basePath, 'docs/master', 'intro.txt'), 'Hello')

    const client = new FsClient(basePath, {
      versions: [
        {
          no: '1.0.0',
          location: 'docs/master'
        }
      ]
    })

    const filesTree = await client.filesTree()
    assert.deepEqual(filesTree, [
      {
        version: {
          location: 'docs/master',
          no: '1.0.0'
        },
        filesTree: [join(basePath, 'docs/master', 'intro.md')]
      }
    ])
  })

  test('return an array of markdown content', async (assert) => {
    await fs.outputFile(join(basePath, 'docs/master', 'intro.md'), 'Hi')
    await fs.outputFile(join(basePath, 'docs/master', 'intro.txt'), 'Hello')
    await fs.outputFile(join(basePath, 'docs/master', 'hello.md'), 'Hello')

    const client = new FsClient(basePath, {
      versions: [
        {
          no: '1.0.0',
          location: 'docs/master'
        }
      ]
    })

    const tree = await client.tree()

    assert.lengthOf(tree, 1)
    assert.deepEqual(tree.toJSON()[0].version, {
      location: 'docs/master',
      no: '1.0.0'
    })

    assert.deepEqual(tree.toJSON()[0].tree.map((file) => file.filePath), [
      join(basePath, 'docs/master', 'hello.md'),
      join(basePath, 'docs/master', 'intro.md')
    ])
  })

  test('throw error when calling watchVersion without starting a watcher', async (assert) => {
    const client = new FsClient(basePath, {
      versions: [{ no: '1.0.0', location: 'docs/1.0.0' }]
    })

    const fn = () => client.watchVersion({
      no: '1.0.0',
      location: 'docs/master'
    })
    assert.throw(fn, 'make sure to start the watcher before calling watchVersion')
  })

  test('add a new version to the watcher and versions list', async (assert) => {
    const client = new FsClient(basePath, {
      versions: []
    })

    client.watcher = new FakeWatcher()

    client.watchVersion({
      no: '1.0.0',
      location: 'docs/master'
    })

    assert.deepEqual(client.versions, [{ no: '1.0.0', location: 'docs/master' }])
    assert.deepEqual(client.watcher.actions, [{ action: 'watch', dir: join(basePath, 'docs/master') }])
  })

  test('update version when already exists', async (assert) => {
    const client = new FsClient(basePath, {
      versions: [{ no: '1.0.0', location: 'docs/1.0.0' }]
    })

    client.watcher = new FakeWatcher()

    client.watchVersion({
      no: '1.0.0',
      location: 'docs/master'
    })

    assert.deepEqual(client.versions, [{ no: '1.0.0', location: 'docs/master' }])
    assert.deepEqual(client.watcher.actions, [{ action: 'watch', dir: join(basePath, 'docs/master') }])
  })

  test('throw error when calling unwatchVersion without starting a watcher', async (assert) => {
    const client = new FsClient(basePath, {
      versions: [{ no: '1.0.0', location: 'docs/1.0.0' }]
    })

    const fn = () => client.unwatchVersion(join(basePath, 'docs/1.0.0'))
    assert.throw(fn, 'make sure to start the watcher before calling unwatchVersion')
  })

  test('remove version from watcher list', async (assert) => {
    const client = new FsClient(basePath, {
      versions: [{ no: '1.0.0', location: 'docs/1.0.0' }]
    })

    client.watcher = new FakeWatcher()

    client.unwatchVersion(join(basePath, 'docs/1.0.0'))

    assert.deepEqual(client.versions, [{ no: '1.0.0', location: 'docs/1.0.0' }])
    assert.deepEqual(client.watcher.actions, [{ action: 'unwatch', dir: join(basePath, 'docs/1.0.0') }])
  })

  test('do not remove version when remove directory is not the base directory', async (assert) => {
    const client = new FsClient(basePath, {
      versions: [{ no: '1.0.0', location: 'docs/1.0.0' }]
    })

    client.watcher = new FakeWatcher()

    client.unwatchVersion(join(basePath, 'docs/1.0.0/intro'))

    assert.deepEqual(client.versions, [{ no: '1.0.0', location: 'docs/1.0.0' }])
    assert.deepEqual(client.watcher.actions, [])
  })

  test('return the version for a given file path', async (assert) => {
    const client = new FsClient(basePath, {
      versions: [{ no: '1.0.0', location: 'docs/1.0.0' }]
    })

    client.watcher = new FakeWatcher()
    assert.deepEqual(client._getFileVersion(join(basePath, 'docs/1.0.0/intro.md')), {
      no: '1.0.0',
      location: 'docs/1.0.0'
    })
  })

  test('return undefined when file is not part of a version', async (assert) => {
    const client = new FsClient(basePath, {
      versions: [{ no: '1.0.0', location: 'docs/1.0.0' }]
    })

    client.watcher = new FakeWatcher()
    assert.isUndefined(client._getFileVersion(join(basePath, 'docs/1.1.0/intro.md')))
  })

  test('return correct version when incremental names are same', async (assert) => {
    const client = new FsClient(basePath, {
      versions: [{ no: '1.1.1', location: 'docs/master' }, { no: '1.0.0', location: 'docs/masternew' }]
    })

    client.watcher = new FakeWatcher()
    assert.deepEqual(client._getFileVersion(join(basePath, 'docs/masternew/intro.md')), {
      no: '1.0.0',
      location: 'docs/masternew'
    })
  })

  test('return true from ignoreEvent when event is no add, change or unlink', async (assert) => {
    const client = new FsClient(basePath, {
      versions: []
    })

    assert.isTrue(client._ignoreEvent('addDir', ''))
  })

  test('return true from ignoreEvent when file path is not markdown', async (assert) => {
    const client = new FsClient(basePath, {
      versions: []
    })

    assert.isTrue(client._ignoreEvent('add', 'foo/intro.txt'))
  })

  test('return false from ignoreEvent when file is markdown and event is whitelisted', async (assert) => {
    const client = new FsClient(basePath, {
      versions: []
    })

    assert.isFalse(client._ignoreEvent('add', 'foo/intro.md'))
  })

  test('return file & version for add event', async (assert) => {
    await fs.outputFile(join(basePath, 'docs/master', 'intro.md'), 'hello world')

    const client = new FsClient(basePath, {
      versions: [{ no: '1.0.0', location: 'docs/master' }]
    })

    const { event, data } = await client._getEventData('add', join(basePath, 'docs/master', 'intro.md'))
    assert.deepEqual(data.version, { no: '1.0.0', location: 'docs/master' })
    assert.equal(data.file.baseName, 'intro.md')
    assert.equal(data.file.filePath, join(basePath, 'docs/master', 'intro.md'))
    assert.equal(event, 'add')
  })

  test('return file & version for change event', async (assert) => {
    await fs.outputFile(join(basePath, 'docs/master', 'intro.md'), 'hello world')

    const client = new FsClient(basePath, {
      versions: [{ no: '1.0.0', location: 'docs/master' }]
    })

    const { event, data } = await client._getEventData('change', join(basePath, 'docs/master', 'intro.md'))
    assert.deepEqual(data.version, { no: '1.0.0', location: 'docs/master' })
    assert.equal(data.file.baseName, 'intro.md')
    assert.equal(data.file.filePath, join(basePath, 'docs/master', 'intro.md'))
    assert.equal(event, 'change')
  })

  test('return version node for unlinkDir event, when directory is version root', async (assert) => {
    await fs.outputFile(join(basePath, 'docs/master', 'intro.md'), 'hello world')

    const client = new FsClient(basePath, {
      versions: [{ no: '1.0.0', location: 'docs/master' }]
    })
    client.watcher = new FakeWatcher()

    const { event, data } = await client._getEventData('unlinkDir', join(basePath, 'docs/master'))
    assert.deepEqual(data, { no: '1.0.0', location: 'docs/master' })
    assert.equal(event, 'unlink:version')
    assert.deepEqual(client.watcher.actions, [{ action: 'unwatch', dir: join(basePath, 'docs/master') }])
  })

  test('return path for unlinkDir event, when directory is not version root', async (assert) => {
    await fs.outputFile(join(basePath, 'docs/master', 'intro.md'), 'hello world')

    const client = new FsClient(basePath, {
      versions: [{ no: '1.0.0', location: 'docs/master' }]
    })
    client.watcher = new FakeWatcher()

    const { event, data: filePath } = await client._getEventData('unlinkDir', join(basePath, 'docs/master/intro'))
    assert.equal(filePath, join(basePath, 'docs/master/intro'))
    assert.equal(event, 'unlinkDir')
  })

  test('return path for unlink event', async (assert) => {
    await fs.outputFile(join(basePath, 'docs/master', 'intro.md'), 'hello world')

    const client = new FsClient(basePath, {
      versions: [{ no: '1.0.0', location: 'docs/master' }]
    })

    const { event, data: filePath } = await client._getEventData('unlink', join(basePath, 'docs/master', 'intro.md'))
    assert.equal(filePath, join(basePath, 'docs/master', 'intro.md'))
    assert.equal(event, 'unlink')
  })

  test('throw error when changed file is not part of the version tree', async (assert) => {
    assert.plan(1)

    const client = new FsClient(basePath, {
      versions: [{ no: '1.0.0', location: 'docs/master' }]
    })

    try {
      await client._getEventData('add', join(basePath, 'foo', 'intro.md'))
    } catch ({ message }) {
      assert.equal(message, `${join(basePath, 'foo', 'intro.md')} file is not part of version tree`)
    }
  })

  test.skip('emit add event when dimer.json file is added', (assert, done) => {
    assert.plan(1)

    const client = new FsClient(basePath, {
      versions: [{ no: '1.0.0', location: 'docs/master' }]
    })

    const dimerJSON = join(basePath, 'dimer.json')

    client.watch(dimerJSON, function (event) {
      client.watcher.close()

      done(() => {
        assert.equal(event, 'config:add')
      })
    })

    client.watcher.chokidar.once('ready', () => {
      console.log('ready')
      setTimeout(() => {
        console.log('creating file')
        fs.outputJSON(dimerJSON, {})
      }, 3500)
    })
  }).timeout(10000)

  test.skip('emit add event when new doc is added inside the docs dir', (assert, done) => {
    assert.plan(2)

    const client = new FsClient(basePath, {
      versions: [{ no: '1.0.0', location: 'docs/master' }]
    })

    const dimerJSON = join(basePath, 'dimer.json')
    const filePath = join(basePath, 'docs/master', 'intro.md')

    client.watch(dimerJSON, function (event, { file }) {
      client.watcher.close()

      done(() => {
        assert.equal(event, 'add')
        assert.equal(file.filePath, filePath)
      })
    })

    client.watcher.chokidar.once('ready', () => {
      console.log('ready')
      fs.outputFile(filePath, 'hello')
    })
  }).timeout(6000)

  test.skip('emit change event when new doc is changed inside the docs dir', (assert, done) => {
    assert.plan(2)

    const dimerJSON = join(basePath, 'dimer.json')
    const filePath = join(basePath, 'docs/master', 'intro.md')

    const client = new FsClient(basePath, {
      versions: [{ no: '1.0.0', location: 'docs/master' }]
    })

    fs
      .outputFile(filePath, 'hello')
      .then(() => {
        client.watch(dimerJSON, function (event, { file }) {
          client.watcher.close()

          done(() => {
            assert.equal(event, 'change')
            assert.equal(file.filePath, filePath)
          })
        })

        client.watcher.chokidar.once('ready', () => {
          console.log('ready')
          fs.outputFile(filePath, 'hello')
        })
      })
      .catch(done)
  }).timeout(6000)

  test.skip('emit unlink event when new doc is removed', (assert, done) => {
    assert.plan(2)

    const dimerJSON = join(basePath, 'dimer.json')
    const filePath = join(basePath, 'docs/master', 'intro.md')

    const client = new FsClient(basePath, {
      versions: [{ no: '1.0.0', location: 'docs/master' }]
    })

    fs
      .outputFile(filePath, 'hello')
      .then(() => {
        client.watch(dimerJSON, function (event, path) {
          if (event === 'unlink') {
            console.log('attempting to call done')
            done(() => {
              console.log('calling done')
              assert.equal(event, 'unlink')
              assert.equal(path, filePath)
              client.watcher.close()
            })
          }
        })

        client.watcher.chokidar.once('ready', () => {
          console.log('ready')
          setTimeout(() => {
            fs.remove(filePath)
          }, 100)
        })
      })
      .catch(done)
  }).timeout(8000)

  test.skip('emit add event when version was added later', (assert, done) => {
    assert.plan(2)

    const dimerJSON = join(basePath, 'dimer.json')
    const filePath = join(basePath, 'docs/1.0.0', 'intro.md')

    const client = new FsClient(basePath, { versions: [] })

    client.watch(dimerJSON, function (event, { file }) {
      client.watcher.close()

      done(() => {
        assert.equal(event, 'add')
        assert.equal(file.filePath, filePath)
      })
    })

    client.watcher.chokidar.once('ready', () => {
      console.log('ready')
      client.watchVersion({ no: '1.0.0', location: 'docs/1.0.0' })
      fs.outputFile(filePath)
    })
  }).timeout(6000)
})
