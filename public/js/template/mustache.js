(function defineMustache(global, factory) {
    if (typeof exports === 'object' && exports && typeof exports.nodeName !== 'string') {
        factory(exports);
    } else if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else {
        global.Mustache = {};
        factory(global.Mustache);
    }
}(this, function mustacheFactory(mustache) {

    let objectToString = Object.prototype.toString;
    let isArray = Array.isArray || function isArrayPolyfill(object) {
        return objectToString.call(object) === '[object Array]';
    };

    function isFunction(object) {
        return typeof object === 'function';
    }


    function typeStr(obj) {
        return isArray(obj) ? 'array' : typeof obj;
    }

    function escapeRegExp(string) {
        return string.replace(/[\-\[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }

    function hasProperty(obj, propName) {
        return obj != null && typeof obj === 'object' && (propName in obj);
    }


    function primitiveHasOwnProperty(primitive, propName) {
        return (primitive != null && typeof primitive !== 'object' && primitive.hasOwnProperty && primitive.hasOwnProperty(propName));
    }

    let regExpTest = RegExp.prototype.test;

    function testRegExp(re, string) {
        return regExpTest.call(re, string);
    }

    let nonSpaceRe = /\S/;

    function isWhitespace(string) {
        return !testRegExp(nonSpaceRe, string);
    }

    let entityMap = {
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`': '&#x60;', '=': '&#x3D;'
    };

    function escapeHtml(string) {
        return String(string).replace(/[&<>"'`=\/]/g, function fromEntityMap(s) {
            return entityMap[s];
        });
    }

    let whiteRe = /\s*/;
    let spaceRe = /\s+/;
    let equalsRe = /\s*=/;
    let curlyRe = /\s*}/;
    let tagRe = /#|\^|\/|>|\{|&|=|!/;

    function parseTemplate(template, tags) {
        if (!template) return [];

        let sections = [];
        let tokens = [];
        let spaces = [];
        let hasTag = false;
        let nonSpace = false;

        function stripSpace() {
            if (hasTag && !nonSpace) {
                while (spaces.length) delete tokens[spaces.pop()];
            } else {
                spaces = [];
            }

            hasTag = false;
            nonSpace = false;
        }

        let openingTagRe, closingTagRe, closingCurlyRe;

        function compileTags(tagsToCompile) {
            if (typeof tagsToCompile === 'string') tagsToCompile = tagsToCompile.split(spaceRe, 2);

            if (!isArray(tagsToCompile) || tagsToCompile.length !== 2) throw new Error('Invalid tags: ' + tagsToCompile);

            openingTagRe = new RegExp(escapeRegExp(tagsToCompile[0]) + '\\s*');
            closingTagRe = new RegExp('\\s*' + escapeRegExp(tagsToCompile[1]));
            closingCurlyRe = new RegExp('\\s*' + escapeRegExp('}' + tagsToCompile[1]));
        }

        compileTags(tags || mustache.tags);

        let scanner = new Scanner(template);

        let start, type, value, chr, token, openSection;
        while (!scanner.eos()) {
            start = scanner.pos;

            value = scanner.scanUntil(openingTagRe);

            if (value) {
                for (let i = 0, valueLength = value.length; i < valueLength; ++i) {
                    chr = value.charAt(i);

                    if (isWhitespace(chr)) {
                        spaces.push(tokens.length);
                    } else {
                        nonSpace = true;
                    }

                    tokens.push(['text', chr, start, start + 1]);
                    start += 1;

                    if (chr === '\n') stripSpace();
                }
            }

            if (!scanner.scan(openingTagRe)) break;

            hasTag = true;

            type = scanner.scan(tagRe) || 'name';
            scanner.scan(whiteRe);

            if (type === '=') {
                value = scanner.scanUntil(equalsRe);
                scanner.scan(equalsRe);
                scanner.scanUntil(closingTagRe);
            } else if (type === '{') {
                value = scanner.scanUntil(closingCurlyRe);
                scanner.scan(curlyRe);
                scanner.scanUntil(closingTagRe);
                type = '&';
            } else {
                value = scanner.scanUntil(closingTagRe);
            }

            if (!scanner.scan(closingTagRe)) throw new Error('Unclosed tag at ' + scanner.pos);

            token = [type, value, start, scanner.pos];
            tokens.push(token);

            if (type === '#' || type === '^') {
                sections.push(token);
            } else if (type === '/') {
                openSection = sections.pop();

                if (!openSection) throw new Error('Unopened section "' + value + '" at ' + start);

                if (openSection[1] !== value) throw new Error('Unclosed section "' + openSection[1] + '" at ' + start);
            } else if (type === 'name' || type === '{' || type === '&') {
                nonSpace = true;
            } else if (type === '=') {
                compileTags(value);
            }
        }

        openSection = sections.pop();

        if (openSection) throw new Error('Unclosed section "' + openSection[1] + '" at ' + scanner.pos);

        return nestTokens(squashTokens(tokens));
    }

    /**
     * Combines the values of consecutive text tokens in the given `tokens` array
     * to a single token.
     */
    function squashTokens(tokens) {
        let squashedTokens = [];

        let token, lastToken;
        for (let i = 0, numTokens = tokens.length; i < numTokens; ++i) {
            token = tokens[i];

            if (token) {
                if (token[0] === 'text' && lastToken && lastToken[0] === 'text') {
                    lastToken[1] += token[1];
                    lastToken[3] = token[3];
                } else {
                    squashedTokens.push(token);
                    lastToken = token;
                }
            }
        }

        return squashedTokens;
    }

    /**
     * Forms the given array of `tokens` into a nested tree structure where
     * tokens that represent a section have two additional items: 1) an array of
     * all tokens that appear in that section and 2) the index in the original
     * template that represents the end of that section.
     */
    function nestTokens(tokens) {
        let nestedTokens = [];
        let collector = nestedTokens;
        let sections = [];

        let token, section;
        for (let i = 0, numTokens = tokens.length; i < numTokens; ++i) {
            token = tokens[i];

            switch (token[0]) {
                case '#':
                case '^':
                    collector.push(token);
                    sections.push(token);
                    collector = token[4] = [];
                    break;
                case '/':
                    section = sections.pop();
                    section[5] = token[2];
                    collector = sections.length > 0 ? sections[sections.length - 1][4] : nestedTokens;
                    break;
                default:
                    collector.push(token);
            }
        }

        return nestedTokens;
    }

    /**
     * A simple string scanner that is used by the template parser to find
     * tokens in template strings.
     */
    function Scanner(string) {
        this.string = string;
        this.tail = string;
        this.pos = 0;
    }

    /**
     * Returns `true` if the tail is empty (end of string).
     */
    Scanner.prototype.eos = function eos() {
        return this.tail === '';
    };

    /**
     * Tries to match the given regular expression at the current position.
     * Returns the matched text if it can match, the empty string otherwise.
     */
    Scanner.prototype.scan = function scan(re) {
        let match = this.tail.match(re);

        if (!match || match.index !== 0) return '';

        let string = match[0];

        this.tail = this.tail.substring(string.length);
        this.pos += string.length;

        return string;
    };


    Scanner.prototype.scanUntil = function scanUntil(re) {
        let index = this.tail.search(re), match;

        switch (index) {
            case -1:
                match = this.tail;
                this.tail = '';
                break;
            case 0:
                match = '';
                break;
            default:
                match = this.tail.substring(0, index);
                this.tail = this.tail.substring(index);
        }

        this.pos += match.length;

        return match;
    };

    function Context(view, parentContext) {
        this.view = view;
        this.cache = {'.': this.view};
        this.parent = parentContext;
    }

    Context.prototype.push = function push(view) {
        return new Context(view, this);
    };


    Context.prototype.lookup = function lookup(name) {
        let cache = this.cache;

        let value;
        if (cache.hasOwnProperty(name)) {
            value = cache[name];
        } else {
            let context = this, intermediateValue, names, index, lookupHit = false;

            while (context) {
                if (name.indexOf('.') > 0) {
                    intermediateValue = context.view;
                    names = name.split('.');
                    index = 0;


                    while (intermediateValue != null && index < names.length) {
                        if (index === names.length - 1) lookupHit = (hasProperty(intermediateValue, names[index]) || primitiveHasOwnProperty(intermediateValue, names[index]));

                        intermediateValue = intermediateValue[names[index++]];
                    }
                } else {
                    intermediateValue = context.view[name];


                    lookupHit = hasProperty(context.view, name);
                }

                if (lookupHit) {
                    value = intermediateValue;
                    break;
                }

                context = context.parent;
            }

            cache[name] = value;
        }

        if (isFunction(value)) value = value.call(this.view);

        return value;
    };


    function Writer() {
        this.cache = {};
    }


    Writer.prototype.clearCache = function clearCache() {
        this.cache = {};
    };

    Writer.prototype.parse = function parse(template, tags) {
        let cache = this.cache;
        let cacheKey = template + ':' + (tags || mustache.tags).join(':');
        let tokens = cache[cacheKey];

        if (tokens == null) tokens = cache[cacheKey] = parseTemplate(template, tags);

        return tokens;
    };

    Writer.prototype.render = function render(template, view, partials, tags) {
        let tokens = this.parse(template, tags);
        let context = (view instanceof Context) ? view : new Context(view);
        return this.renderTokens(tokens, context, partials, template, tags);
    };

    Writer.prototype.renderTokens = function renderTokens(tokens, context, partials, originalTemplate, tags) {
        let buffer = '';

        let token, symbol, value;
        for (let i = 0, numTokens = tokens.length; i < numTokens; ++i) {
            value = undefined;
            token = tokens[i];
            symbol = token[0];

            if (symbol === '#') value = this.renderSection(token, context, partials, originalTemplate); else if (symbol === '^') value = this.renderInverted(token, context, partials, originalTemplate); else if (symbol === '>') value = this.renderPartial(token, context, partials, tags); else if (symbol === '&') value = this.unescapedValue(token, context); else if (symbol === 'name') value = this.escapedValue(token, context); else if (symbol === 'text') value = this.rawValue(token);

            if (value !== undefined) buffer += value;
        }

        return buffer;
    };

    Writer.prototype.renderSection = function renderSection(token, context, partials, originalTemplate) {
        let self = this;
        let buffer = '';
        let value = context.lookup(token[1]);

        function subRender(template) {
            return self.render(template, context, partials);
        }

        if (!value) return;

        if (isArray(value)) {
            for (let j = 0, valueLength = value.length; j < valueLength; ++j) {
                buffer += this.renderTokens(token[4], context.push(value[j]), partials, originalTemplate);
            }
        } else if (typeof value === 'object' || typeof value === 'string' || typeof value === 'number') {
            buffer += this.renderTokens(token[4], context.push(value), partials, originalTemplate);
        } else if (isFunction(value)) {
            if (typeof originalTemplate !== 'string') throw new Error('Cannot use higher-order sections without the original template');

            value = value.call(context.view, originalTemplate.slice(token[3], token[5]), subRender);

            if (value != null) buffer += value;
        } else {
            buffer += this.renderTokens(token[4], context, partials, originalTemplate);
        }
        return buffer;
    };

    Writer.prototype.renderInverted = function renderInverted(token, context, partials, originalTemplate) {
        let value = context.lookup(token[1]);

        if (!value || (isArray(value) && value.length === 0)) return this.renderTokens(token[4], context, partials, originalTemplate);
    };

    Writer.prototype.renderPartial = function renderPartial(token, context, partials, tags) {
        if (!partials) return;

        let value = isFunction(partials) ? partials(token[1]) : partials[token[1]];
        if (value != null) return this.renderTokens(this.parse(value, tags), context, partials, value);
    };

    Writer.prototype.unescapedValue = function unescapedValue(token, context) {
        let value = context.lookup(token[1]);
        if (value != null) return value;
    };

    Writer.prototype.escapedValue = function escapedValue(token, context) {
        let value = context.lookup(token[1]);
        if (value != null) return mustache.escape(value);
    };

    Writer.prototype.rawValue = function rawValue(token) {
        return token[1];
    };

    mustache.name = 'mustache.js';
    mustache.version = '3.0.1';
    mustache.tags = ['{{', '}}'];

    let defaultWriter = new Writer();

    mustache.clearCache = function clearCache() {
        return defaultWriter.clearCache();
    };

    mustache.parse = function parse(template, tags) {
        return defaultWriter.parse(template, tags);
    };

    mustache.render = function render(template, view, partials, tags) {
        if (typeof template !== 'string') {
            throw new TypeError('Invalid template! Template should be a "string" ' + 'but "' + typeStr(template) + '" was given as the first ' + 'argument for mustache#render(template, view, partials)');
        }

        return defaultWriter.render(template, view, partials, tags);
    };

    mustache.to_html = function to_html(template, view, partials, send) {


        let result = mustache.render(template, view, partials);

        if (isFunction(send)) {
            send(result);
        } else {
            return result;
        }
    };

    mustache.escape = escapeHtml;

    mustache.Scanner = Scanner;
    mustache.Context = Context;
    mustache.Writer = Writer;

    return mustache;
}));
