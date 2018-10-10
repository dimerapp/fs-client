<a name="2.0.1"></a>
## [2.0.1](https://github.com/dimerapp/fs-client/compare/v2.0.0...v2.0.1) (2018-10-10)



<a name="2.0.0"></a>
# [2.0.0](https://github.com/dimerapp/fs-client/compare/v1.0.11...v2.0.0) (2018-08-29)


### Features

* **zones:** add support for zones ([a14ed6f](https://github.com/dimerapp/fs-client/commit/a14ed6f))


### BREAKING CHANGES

* **zones:** instantiating a new client requires and array of zones and not versions



<a name="1.0.11"></a>
## [1.0.11](https://github.com/dimerapp/fs-client/compare/v1.0.10...v1.0.11) (2018-08-03)


### Features

* only processed unscanned versions ([e123906](https://github.com/dimerapp/fs-client/commit/e123906))



<a name="1.0.10"></a>
## [1.0.10](https://github.com/dimerapp/fs-client/compare/v1.0.9...v1.0.10) (2018-08-03)


### Bug Fixes

* accept version object vs location when calling unWatch ([cea5d8b](https://github.com/dimerapp/fs-client/commit/cea5d8b))
* return versions array for events ([e428de9](https://github.com/dimerapp/fs-client/commit/e428de9))
* unwatch version location, only when it's not shared ([38d2b8c](https://github.com/dimerapp/fs-client/commit/38d2b8c))



<a name="1.0.9"></a>
## [1.0.9](https://github.com/dimerapp/fs-client/compare/v1.0.8...v1.0.9) (2018-08-01)


### Bug Fixes

* use ctx.get to access properties ([f57bb16](https://github.com/dimerapp/fs-client/commit/f57bb16))



<a name="1.0.8"></a>
## [1.0.8](https://github.com/dimerapp/fs-client/compare/v1.0.7...v1.0.8) (2018-08-01)


### Code Refactoring

* use ctx instead of basePath ([98839ce](https://github.com/dimerapp/fs-client/commit/98839ce))


### BREAKING CHANGES

* fsClient accepts in total 2 arguments vs 3 earlier and 1st arg is now the ctx
instance



<a name="1.0.7"></a>
## [1.0.7](https://github.com/dimerapp/fs-client/compare/v1.0.6...v1.0.7) (2018-08-01)


### Bug Fixes

* **watcher:** pass this.markdownOptions to watcher file instance ([9a02026](https://github.com/dimerapp/fs-client/commit/9a02026))



<a name="1.0.6"></a>
## [1.0.6](https://github.com/dimerapp/fs-client/compare/v1.0.5...v1.0.6) (2018-07-31)



<a name="1.0.5"></a>
## [1.0.5](https://github.com/dimerapp/fs-client/compare/v1.0.4...v1.0.5) (2018-07-29)


### Features

* **tree:** ignore drafts starting with _ ([49e2516](https://github.com/dimerapp/fs-client/commit/49e2516))



<a name="1.0.4"></a>
## [1.0.4](https://github.com/dimerapp/fs-client/compare/v1.0.3...v1.0.4) (2018-07-28)


### Code Refactoring

* **watcher:** client.watch doesn't accept dimer.json path ([b0e0f7d](https://github.com/dimerapp/fs-client/commit/b0e0f7d))


### BREAKING CHANGES

* **watcher:** dimer.watch accepts a single argument, which is a callback



<a name="1.0.3"></a>
## [1.0.3](https://github.com/dimerapp/fs-client/compare/v1.0.2...v1.0.3) (2018-07-26)



<a name="1.0.2"></a>
## [1.0.2](https://github.com/dimerapp/fs-client/compare/v1.0.1...v1.0.2) (2018-07-26)



<a name="1.0.1"></a>
## [1.0.1](https://github.com/dimerapp/fs-client/compare/v1.0.0...v1.0.1) (2018-07-25)


### Features

* raise proper error when version base directory is missing ([2f5a9bc](https://github.com/dimerapp/fs-client/commit/2f5a9bc))



<a name="1.0.0"></a>
# 1.0.0 (2018-07-24)


### Bug Fixes

* normalize paths to be cross platform ([b2642be](https://github.com/dimerapp/fs-client/commit/b2642be))


### Features

* initial working version ([bce6113](https://github.com/dimerapp/fs-client/commit/bce6113))
* initiate project ([036949b](https://github.com/dimerapp/fs-client/commit/036949b))
* **events:** emit unlink:version when directory is the version root ([3b910c3](https://github.com/dimerapp/fs-client/commit/3b910c3))



