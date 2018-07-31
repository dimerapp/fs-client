<div align="center">
  <div>
    <img width="500" src="https://res.cloudinary.com/adonisjs/image/upload/q_100/v1532274184/Dimer_Readme_Banner_lyy7wv.svg" alt="Dimer App">
  </div>
  <br>
  <p>
    <a href="https://dimerapp.com/what-is-dimer">
      Dimer is an open source project and CMS to help you publish your documentation online.
    </a>
  </p>
  <br>
  <p>
    <sub>We believe every project/product is incomplete without documentation. <br /> We want to help you publish user facing documentation, without worrying <code>about tools or code</code> to write.</sub>
  </p>
  <br>
</div>

# Dimer FsClient

The file system client for Dimer offers the API to convert the docs into a tree of versions and docs content. Later you can use this with the combination of [datastore](https://github.com/dimerapp/datastore) to store it with the database.

## Installation

```shell
npm i @dimerapp/fs-client

# yarn
yarn add @dimerapp/fs-client
```

## Usage

```js
const FsClient = require('@dimerapp/fs-client')
const ConfigParser = require('@dimerapp/config-parser')
const { join } = require('path')

const basePath = process.cwd()

const { errors, config } = await (new ConfigStore(join(basePath, 'dimer.json'))).parse()
const client = new FsClient(basePath, config, {
  async onUrl () {

  }
})

const tree = await client.tree()
```

#### Allowed files
The files must have `.md`, `.markdown`, `.mkd` and `.mkdown` extensions, otherwise they will be ignored.

## Watch for changes

```js
client.watch(async (event, arg) => {
  if (event === 'add:doc' || event === 'change:doc') {
    console.log(arg) // instance of dFile
  }

  if (event === 'unlink:doc') {
    console.log(arg) // will be { version: object, baseName: string }
  }

  if (event === 'unlink:version') {
    console.log('removed directory for a given version')
  }

  if (event === 'config:change' || event === 'config:add') {
    console.log('config file changed')
  }

  if (event === 'config:unlink') {
    console.log('config file removed, stop watcher')
  }
})
```

## Fs client API
Following is the API for the watcher.

```js
const FsClient = require('@dimerapp/fs-client')
const client = new FsClient(basePath, config)

// or with markdown options
const client = new FsClient(basePath, config, {
  async onUrl () {
  }
})
```

#### filesTree
Returns an array of files path tree for all the versions. Only files ending with `.md` and `.markdown` are picked.

```js
const tree = await client.filesTree()
```

#### tree
Returns a content tree of all the files mapped with their versions.

```js
const tree = await client.tree()
```

#### watch
Watch for changes in the docs or the config file. `dimer.json`.

```js
client.watch(() => {
})
```

#### watchVersion(version)
Tell watcher to start watching a new version when it is added to the config file.

```js
client.watchVersion({
  no: '1.0.0',
  location: 'docs/1.0.0'
})
```

#### unwatchVersion(location)
Tell watcher to stop watching files for a given version, when it is removed from the config file.

```js
client.unwatchVersion('docs/master')
```

[![travis-image]][travis-url]
[![npm-image]][npm-url]

## Change log

The change log can be found in the [CHANGELOG.md](https://github.com/dimerapp/fs-client/CHANGELOG.md) file.

## Contributing

Everyone is welcome to contribute. Please take a moment to review the [contributing guidelines](CONTRIBUTING.md).

## Authors & License
[thetutlage](https://github.com/thetutlage) and [contributors](https://github.com/dimerapp/fs-client/graphs/contributors).

MIT License, see the included [MIT](LICENSE.md) file.

[travis-image]: https://img.shields.io/travis/dimerapp/fs-client/master.svg?style=flat-square&logo=travis
[travis-url]: https://travis-ci.org/dimerapp/fs-client "travis"

[npm-image]: https://img.shields.io/npm/v/@dimerapp/fs-client.svg?style=flat-square&logo=npm
[npm-url]: https://npmjs.org/package/@dimerapp/fs-client "npm"
