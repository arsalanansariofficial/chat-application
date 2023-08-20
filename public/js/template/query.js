(function (f) {
    if (typeof exports === "object" && typeof module !== "undefined") {
        module.exports = f()
    } else if (typeof define === "function" && define.amd) {
        define([], f)
    } else {
        let g;
        if (typeof window !== "undefined") {
            g = window
        } else if (typeof global !== "undefined") {
            g = global
        } else if (typeof self !== "undefined") {
            g = self
        } else {
            g = this
        }
        g.Qs = f()
    }
})(function () {
    let define, module, exports;
    return (function () {
        function r(e, n, t) {
            function o(i, f) {
                if (!n[i]) {
                    if (!e[i]) {
                        let c = "function" == typeof require && require;
                        if (!f && c) return c(i, !0);
                        if (u) return u(i, !0);
                        let a = new Error("Cannot find module '" + i + "'");
                        throw a.code = "MODULE_NOT_FOUND", a
                    }
                    let p = n[i] = {exports: {}};
                    e[i][0].call(p.exports, function (r) {
                        let n = e[i][1][r];
                        return o(n || r)
                    }, p, p.exports, r, e, n, t)
                }
                return n[i].exports
            }

            for (let u = "function" == typeof require && require, i = 0; i < t.length; i++) o(t[i]);
            return o
        }

        return r
    })()({
        1: [function (require, module, exports) {
            'use strict';

            let replace = String.prototype.replace;
            let percentTwenties = /%20/g;

            module.exports = {
                'default': 'RFC3986', formatters: {
                    RFC1738: function (value) {
                        return replace.call(value, percentTwenties, '+');
                    }, RFC3986: function (value) {
                        return value;
                    }
                }, RFC1738: 'RFC1738', RFC3986: 'RFC3986'
            };

        }, {}], 2: [function (require, module, exports) {
            'use strict';

            let stringify = require('./stringify');
            let parse = require('./parse');
            let formats = require('./formats');

            module.exports = {
                formats: formats, parse: parse, stringify: stringify
            };

        }, {"./formats": 1, "./parse": 3, "./stringify": 4}], 3: [function (require, module, exports) {
            'use strict';

            let utils = require('./utils');

            let has = Object.prototype.hasOwnProperty;

            let defaults = {
                allowDots: false,
                allowPrototypes: false,
                arrayLimit: 20,
                charset: 'utf-8',
                charsetSentinel: false,
                decoder: utils.decode,
                delimiter: '&',
                depth: 5,
                ignoreQueryPrefix: false,
                interpretNumericEntities: false,
                parameterLimit: 1000,
                parseArrays: true,
                plainObjects: false,
                strictNullHandling: false
            };

            let interpretNumericEntities = function (str) {
                return str.replace(/&#(\d+);/g, function ($0, numberStr) {
                    return String.fromCharCode(parseInt(numberStr, 10));
                });
            };

            let isoSentinel = 'utf8=%26%2310003%3B';
            let charsetSentinel = 'utf8=%E2%9C%93';
            let parseValues = function parseQueryStringValues(str, options) {
                let obj = {};
                let cleanStr = options.ignoreQueryPrefix ? str.replace(/^\?/, '') : str;
                let limit = options.parameterLimit === Infinity ? undefined : options.parameterLimit;
                let parts = cleanStr.split(options.delimiter, limit);
                let skipIndex = -1;
                let i;

                let charset = options.charset;
                if (options.charsetSentinel) {
                    for (i = 0; i < parts.length; ++i) {
                        if (parts[i].indexOf('utf8=') === 0) {
                            if (parts[i] === charsetSentinel) {
                                charset = 'utf-8';
                            } else if (parts[i] === isoSentinel) {
                                charset = 'iso-8859-1';
                            }
                            skipIndex = i;
                            i = parts.length;
                        }
                    }
                }

                for (i = 0; i < parts.length; ++i) {
                    if (i === skipIndex) {
                        continue;
                    }
                    let part = parts[i];

                    let bracketEqualsPos = part.indexOf(']=');
                    let pos = bracketEqualsPos === -1 ? part.indexOf('=') : bracketEqualsPos + 1;

                    let key, val;
                    if (pos === -1) {
                        key = options.decoder(part, defaults.decoder, charset);
                        val = options.strictNullHandling ? null : '';
                    } else {
                        key = options.decoder(part.slice(0, pos), defaults.decoder, charset);
                        val = options.decoder(part.slice(pos + 1), defaults.decoder, charset);
                    }

                    if (val && options.interpretNumericEntities && charset === 'iso-8859-1') {
                        val = interpretNumericEntities(val);
                    }
                    if (has.call(obj, key)) {
                        obj[key] = utils.combine(obj[key], val);
                    } else {
                        obj[key] = val;
                    }
                }

                return obj;
            };

            let parseObject = function (chain, val, options) {
                let leaf = val;

                for (let i = chain.length - 1; i >= 0; --i) {
                    let obj;
                    let root = chain[i];

                    if (root === '[]' && options.parseArrays) {
                        obj = [].concat(leaf);
                    } else {
                        obj = options.plainObjects ? Object.create(null) : {};
                        let cleanRoot = root.charAt(0) === '[' && root.charAt(root.length - 1) === ']' ? root.slice(1, -1) : root;
                        let index = parseInt(cleanRoot, 10);
                        if (!options.parseArrays && cleanRoot === '') {
                            obj = {0: leaf};
                        } else if (!isNaN(index) && root !== cleanRoot && String(index) === cleanRoot && index >= 0 && (options.parseArrays && index <= options.arrayLimit)) {
                            obj = [];
                            obj[index] = leaf;
                        } else {
                            obj[cleanRoot] = leaf;
                        }
                    }

                    leaf = obj;
                }

                return leaf;
            };

            let parseKeys = function parseQueryStringKeys(givenKey, val, options) {
                if (!givenKey) {
                    return;
                }

                let key = options.allowDots ? givenKey.replace(/\.([^.[]+)/g, '[$1]') : givenKey;

                let brackets = /(\[[^[\]]*])/;
                let child = /(\[[^[\]]*])/g;

                let segment = brackets.exec(key);
                let parent = segment ? key.slice(0, segment.index) : key;

                let keys = [];
                if (parent) {
                    if (!options.plainObjects && has.call(Object.prototype, parent)) {
                        if (!options.allowPrototypes) {
                            return;
                        }
                    }

                    keys.push(parent);
                }

                let i = 0;
                while ((segment = child.exec(key)) !== null && i < options.depth) {
                    i += 1;
                    if (!options.plainObjects && has.call(Object.prototype, segment[1].slice(1, -1))) {
                        if (!options.allowPrototypes) {
                            return;
                        }
                    }
                    keys.push(segment[1]);
                }

                if (segment) {
                    keys.push('[' + key.slice(segment.index) + ']');
                }

                return parseObject(keys, val, options);
            };

            module.exports = function (str, opts) {
                let options = opts ? utils.assign({}, opts) : {};

                if (options.decoder !== null && options.decoder !== undefined && typeof options.decoder !== 'function') {
                    throw new TypeError('Decoder has to be a function.');
                }

                options.ignoreQueryPrefix = options.ignoreQueryPrefix === true;
                options.delimiter = typeof options.delimiter === 'string' || utils.isRegExp(options.delimiter) ? options.delimiter : defaults.delimiter;
                options.depth = typeof options.depth === 'number' ? options.depth : defaults.depth;
                options.arrayLimit = typeof options.arrayLimit === 'number' ? options.arrayLimit : defaults.arrayLimit;
                options.parseArrays = options.parseArrays !== false;
                options.decoder = typeof options.decoder === 'function' ? options.decoder : defaults.decoder;
                options.allowDots = typeof options.allowDots === 'undefined' ? defaults.allowDots : !!options.allowDots;
                options.plainObjects = typeof options.plainObjects === 'boolean' ? options.plainObjects : defaults.plainObjects;
                options.allowPrototypes = typeof options.allowPrototypes === 'boolean' ? options.allowPrototypes : defaults.allowPrototypes;
                options.parameterLimit = typeof options.parameterLimit === 'number' ? options.parameterLimit : defaults.parameterLimit;
                options.strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults.strictNullHandling;

                if (typeof options.charset !== 'undefined' && options.charset !== 'utf-8' && options.charset !== 'iso-8859-1') {
                    throw new Error('The charset option must be either utf-8, iso-8859-1, or undefined');
                }
                if (typeof options.charset === 'undefined') {
                    options.charset = defaults.charset;
                }

                if (str === '' || str === null || typeof str === 'undefined') {
                    return options.plainObjects ? Object.create(null) : {};
                }

                let tempObj = typeof str === 'string' ? parseValues(str, options) : str;
                let obj = options.plainObjects ? Object.create(null) : {};

                let keys = Object.keys(tempObj);
                for (let i = 0; i < keys.length; ++i) {
                    let key = keys[i];
                    let newObj = parseKeys(key, tempObj[key], options);
                    obj = utils.merge(obj, newObj, options);
                }

                return utils.compact(obj);
            };

        }, {"./utils": 5}], 4: [function (require, module, exports) {
            'use strict';

            let utils = require('./utils');
            let formats = require('./formats');

            let arrayPrefixGenerators = {
                brackets: function brackets(prefix) {
                    return prefix + '[]';
                }, indices: function indices(prefix, key) {
                    return prefix + '[' + key + ']';
                }, repeat: function repeat(prefix) {
                    return prefix;
                }
            };

            let isArray = Array.isArray;
            let push = Array.prototype.push;
            let pushToArray = function (arr, valueOrArray) {
                push.apply(arr, isArray(valueOrArray) ? valueOrArray : [valueOrArray]);
            };

            let toISO = Date.prototype.toISOString;

            let defaults = {
                addQueryPrefix: false,
                allowDots: false,
                charset: 'utf-8',
                charsetSentinel: false,
                delimiter: '&',
                encode: true,
                encoder: utils.encode,
                encodeValuesOnly: false,
                indices: false,
                serializeDate: function serializeDate(date) {
                    return toISO.call(date);
                },
                skipNulls: false,
                strictNullHandling: false
            };

            let stringify = function stringify(object, prefix, generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots, serializeDate, formatter, encodeValuesOnly, charset) {
                let obj = object;
                if (typeof filter === 'function') {
                    obj = filter(prefix, obj);
                } else if (obj instanceof Date) {
                    obj = serializeDate(obj);
                }

                if (obj === null) {
                    if (strictNullHandling) {
                        return encoder && !encodeValuesOnly ? encoder(prefix, defaults.encoder, charset) : prefix;
                    }

                    obj = '';
                }

                if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean' || utils.isBuffer(obj)) {
                    if (encoder) {
                        let keyValue = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder, charset);
                        return [formatter(keyValue) + '=' + formatter(encoder(obj, defaults.encoder, charset))];
                    }
                    return [formatter(prefix) + '=' + formatter(String(obj))];
                }

                let values = [];

                if (typeof obj === 'undefined') {
                    return values;
                }

                let objKeys;
                if (Array.isArray(filter)) {
                    objKeys = filter;
                } else {
                    let keys = Object.keys(obj);
                    objKeys = sort ? keys.sort(sort) : keys;
                }

                for (let i = 0; i < objKeys.length; ++i) {
                    let key = objKeys[i];

                    if (skipNulls && obj[key] === null) {
                        continue;
                    }

                    if (Array.isArray(obj)) {
                        pushToArray(values, stringify(obj[key], generateArrayPrefix(prefix, key), generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots, serializeDate, formatter, encodeValuesOnly, charset));
                    } else {
                        pushToArray(values, stringify(obj[key], prefix + (allowDots ? '.' + key : '[' + key + ']'), generateArrayPrefix, strictNullHandling, skipNulls, encoder, filter, sort, allowDots, serializeDate, formatter, encodeValuesOnly, charset));
                    }
                }

                return values;
            };

            module.exports = function (object, opts) {
                let obj = object;
                let options = opts ? utils.assign({}, opts) : {};

                if (options.encoder !== null && options.encoder !== undefined && typeof options.encoder !== 'function') {
                    throw new TypeError('Encoder has to be a function.');
                }

                let delimiter = typeof options.delimiter === 'undefined' ? defaults.delimiter : options.delimiter;
                let strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults.strictNullHandling;
                let skipNulls = typeof options.skipNulls === 'boolean' ? options.skipNulls : defaults.skipNulls;
                let encode = typeof options.encode === 'boolean' ? options.encode : defaults.encode;
                let encoder = typeof options.encoder === 'function' ? options.encoder : defaults.encoder;
                let sort = typeof options.sort === 'function' ? options.sort : null;
                let allowDots = typeof options.allowDots === 'undefined' ? defaults.allowDots : !!options.allowDots;
                let serializeDate = typeof options.serializeDate === 'function' ? options.serializeDate : defaults.serializeDate;
                let encodeValuesOnly = typeof options.encodeValuesOnly === 'boolean' ? options.encodeValuesOnly : defaults.encodeValuesOnly;
                let charset = options.charset || defaults.charset;
                if (typeof options.charset !== 'undefined' && options.charset !== 'utf-8' && options.charset !== 'iso-8859-1') {
                    throw new Error('The charset option must be either utf-8, iso-8859-1, or undefined');
                }

                if (typeof options.format === 'undefined') {
                    options.format = formats['default'];
                } else if (!Object.prototype.hasOwnProperty.call(formats.formatters, options.format)) {
                    throw new TypeError('Unknown format option provided.');
                }
                let formatter = formats.formatters[options.format];
                let objKeys;
                let filter;

                if (typeof options.filter === 'function') {
                    filter = options.filter;
                    obj = filter('', obj);
                } else if (Array.isArray(options.filter)) {
                    filter = options.filter;
                    objKeys = filter;
                }

                let keys = [];

                if (typeof obj !== 'object' || obj === null) {
                    return '';
                }

                let arrayFormat;
                if (options.arrayFormat in arrayPrefixGenerators) {
                    arrayFormat = options.arrayFormat;
                } else if ('indices' in options) {
                    arrayFormat = options.indices ? 'indices' : 'repeat';
                } else {
                    arrayFormat = 'indices';
                }

                let generateArrayPrefix = arrayPrefixGenerators[arrayFormat];

                if (!objKeys) {
                    objKeys = Object.keys(obj);
                }

                if (sort) {
                    objKeys.sort(sort);
                }

                for (let i = 0; i < objKeys.length; ++i) {
                    let key = objKeys[i];

                    if (skipNulls && obj[key] === null) {
                        continue;
                    }
                    pushToArray(keys, stringify(obj[key], key, generateArrayPrefix, strictNullHandling, skipNulls, encode ? encoder : null, filter, sort, allowDots, serializeDate, formatter, encodeValuesOnly, charset));
                }

                let joined = keys.join(delimiter);
                let prefix = options.addQueryPrefix === true ? '?' : '';

                if (options.charsetSentinel) {
                    if (charset === 'iso-8859-1') {
                        prefix += 'utf8=%26%2310003%3B&';
                    } else {
                        prefix += 'utf8=%E2%9C%93&';
                    }
                }

                return joined.length > 0 ? prefix + joined : '';
            };

        }, {"./formats": 1, "./utils": 5}], 5: [function (require, module, exports) {
            'use strict';

            let has = Object.prototype.hasOwnProperty;

            let hexTable = (function () {
                let array = [];
                for (let i = 0; i < 256; ++i) {
                    array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
                }

                return array;
            }());

            let compactQueue = function compactQueue(queue) {
                while (queue.length > 1) {
                    let item = queue.pop();
                    let obj = item.obj[item.prop];

                    if (Array.isArray(obj)) {
                        let compacted = [];

                        for (let j = 0; j < obj.length; ++j) {
                            if (typeof obj[j] !== 'undefined') {
                                compacted.push(obj[j]);
                            }
                        }

                        item.obj[item.prop] = compacted;
                    }
                }
            };

            let arrayToObject = function arrayToObject(source, options) {
                let obj = options && options.plainObjects ? Object.create(null) : {};
                for (let i = 0; i < source.length; ++i) {
                    if (typeof source[i] !== 'undefined') {
                        obj[i] = source[i];
                    }
                }

                return obj;
            };

            let merge = function merge(target, source, options) {
                if (!source) {
                    return target;
                }

                if (typeof source !== 'object') {
                    if (Array.isArray(target)) {
                        target.push(source);
                    } else if (typeof target === 'object') {
                        if ((options && (options.plainObjects || options.allowPrototypes)) || !has.call(Object.prototype, source)) {
                            target[source] = true;
                        }
                    } else {
                        return [target, source];
                    }

                    return target;
                }

                if (typeof target !== 'object') {
                    return [target].concat(source);
                }

                let mergeTarget = target;
                if (Array.isArray(target) && !Array.isArray(source)) {
                    mergeTarget = arrayToObject(target, options);
                }

                if (Array.isArray(target) && Array.isArray(source)) {
                    source.forEach(function (item, i) {
                        if (has.call(target, i)) {
                            if (target[i] && typeof target[i] === 'object') {
                                target[i] = merge(target[i], item, options);
                            } else {
                                target.push(item);
                            }
                        } else {
                            target[i] = item;
                        }
                    });
                    return target;
                }

                return Object.keys(source).reduce(function (acc, key) {
                    let value = source[key];

                    if (has.call(acc, key)) {
                        acc[key] = merge(acc[key], value, options);
                    } else {
                        acc[key] = value;
                    }
                    return acc;
                }, mergeTarget);
            };

            let assign = function assignSingleSource(target, source) {
                return Object.keys(source).reduce(function (acc, key) {
                    acc[key] = source[key];
                    return acc;
                }, target);
            };

            let decode = function (str, decoder, charset) {
                let strWithoutPlus = str.replace(/\+/g, ' ');
                if (charset === 'iso-8859-1') {
                    return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
                }
                try {
                    return decodeURIComponent(strWithoutPlus);
                } catch (e) {
                    return strWithoutPlus;
                }
            };

            let encode = function encode(str, defaultEncoder, charset) {
                if (str.length === 0) {
                    return str;
                }

                let string = typeof str === 'string' ? str : String(str);

                if (charset === 'iso-8859-1') {
                    return escape(string).replace(/%u[0-9a-f]{4}/gi, function ($0) {
                        return '%26%23' + parseInt($0.slice(2), 16) + '%3B';
                    });
                }

                let out = '';
                for (let i = 0; i < string.length; ++i) {
                    let c = string.charCodeAt(i);

                    if (c === 0x2D || c === 0x2E || c === 0x5F || c === 0x7E || (c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A)) {
                        out += string.charAt(i);
                        continue;
                    }

                    if (c < 0x80) {
                        out = out + hexTable[c];
                        continue;
                    }

                    if (c < 0x800) {
                        out = out + (hexTable[0xC0 | (c >> 6)] + hexTable[0x80 | (c & 0x3F)]);
                        continue;
                    }

                    if (c < 0xD800 || c >= 0xE000) {
                        out = out + (hexTable[0xE0 | (c >> 12)] + hexTable[0x80 | ((c >> 6) & 0x3F)] + hexTable[0x80 | (c & 0x3F)]);
                        continue;
                    }

                    i += 1;
                    c = 0x10000 + (((c & 0x3FF) << 10) | (string.charCodeAt(i) & 0x3FF));
                    out += hexTable[0xF0 | (c >> 18)] + hexTable[0x80 | ((c >> 12) & 0x3F)] + hexTable[0x80 | ((c >> 6) & 0x3F)] + hexTable[0x80 | (c & 0x3F)];
                }

                return out;
            };

            let compact = function compact(value) {
                let queue = [{obj: {o: value}, prop: 'o'}];
                let refs = [];

                for (let i = 0; i < queue.length; ++i) {
                    let item = queue[i];
                    let obj = item.obj[item.prop];

                    let keys = Object.keys(obj);
                    for (let j = 0; j < keys.length; ++j) {
                        let key = keys[j];
                        let val = obj[key];
                        if (typeof val === 'object' && val !== null && refs.indexOf(val) === -1) {
                            queue.push({obj: obj, prop: key});
                            refs.push(val);
                        }
                    }
                }

                compactQueue(queue);

                return value;
            };

            let isRegExp = function isRegExp(obj) {
                return Object.prototype.toString.call(obj) === '[object RegExp]';
            };

            let isBuffer = function isBuffer(obj) {
                if (obj === null || typeof obj === 'undefined') {
                    return false;
                }

                return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
            };

            let combine = function combine(a, b) {
                return [].concat(a, b);
            };

            module.exports = {
                arrayToObject: arrayToObject,
                assign: assign,
                combine: combine,
                compact: compact,
                decode: decode,
                encode: encode,
                isBuffer: isBuffer,
                isRegExp: isRegExp,
                merge: merge
            };

        }, {}]
    }, {}, [2])(2)
});
