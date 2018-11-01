const fs = require('fs');
const glob = require('glob');
const { promisify } = require('es6-promisify');

const readFile = promisify(fs.readFile);
const listFiles = promisify(glob);

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const consequently = (() => {
  var _ref = _asyncToGenerator(function* (promises, separator) {
    let result = '';
    for (const fileContentPromise of promises) {// eslint-disable-line
      const content = yield fileContentPromise; // eslint-disable-line
      if (result !== '') {
        result += separator;
      }
      result += content;
    }
    return result;
  });

  return function consequently(_x, _x2) {
    return _ref.apply(this, arguments);
  };
})();

const parallely = (promises, separator) => Promise.all(promises).then(results => results.join(separator));

class MergeIntoFile {
  constructor(options) {
    this.options = options;
  }

  apply(compiler) {
    if (compiler.hooks) {
      const plugin = { name: 'MergeIntoFile' };
      compiler.hooks.emit.tapAsync(plugin, this.run.bind(this));
    } else {
      compiler.plugin('emit', this.run.bind(this));
    }
  }

  run(compilation, callback) {
    var _this = this;

    return _asyncToGenerator(function* () {
      const { files, transform, ordered, encoding } = _this.options;
      const finalPromises = Object.keys(files).map((() => {
        var _ref2 = _asyncToGenerator(function* (newFile) {
          const listOfLists = yield Promise.all(files[newFile].map(function (path) {
            return listFiles(path, null);
          }));
          const flattenedList = Array.prototype.concat.apply([], listOfLists);
          const filesContentPromises = flattenedList.map(function (path) {
            return readFile(path, encoding || 'utf-8');
          });
          let content = yield (ordered ? consequently : parallely)(filesContentPromises, '\n');
          if (transform && transform[newFile]) {
            content = transform[newFile](content);
          }
          compilation.assets[newFile] = { // eslint-disable-line no-param-reassign
            source() {
              return content;
            },
            size() {
              return content.length;
            }
          };
        });

        return function (_x3) {
          return _ref2.apply(this, arguments);
        };
      })());

      try {
        yield Promise.all(finalPromises);
        callback();
      } catch (error) {
        callback(error);
      }
    })();
  }
}

module.exports = MergeIntoFile;
