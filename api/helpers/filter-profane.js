/* global sails, _ */
module.exports = {

    friendlyName: 'filterProfane',

    description: 'Filter out any profanity in a string',

    inputs: {
        message: {
            type: 'string',
            defaultsTo: '',
            description: 'The string to be filtered.'
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper filterProfane called.');
        try {

            var util = {eachRecursive: function (obj, fn, maxDepth, depth, checked) {
                    checked = checked || [];

                    depth = depth || 0;

                    if ((maxDepth && depth > maxDepth) || obj in checked) {
                        return;
                    }

                    _.each(obj, function (val, key) {
                        checked.push(obj);

                        if (_.isObject(val)) {
                            if (val in checked) {
                                return;
                            }

                            checked.push(val);

                            depth += 1;
                            eachRecursive(val, fn, depth, checked);
                        } else {
                            fn(val, key, obj, depth);
                        }
                    });
                }};

            var profanity = {
                check: function (target, options) {
                    var targets = [],
                            fRef,
                            regex;

                    options = options || {};

                    // Backwards compatibility
                    if (Array.isArray(options)) {
                        fRef = options;
                        options = {forbiddenList: fRef};

                        console.log('profanity-util: The `forbiddenList` parameter is deprecated since 0.1.0. Please use `options` instead.');
                    }

                    regex = getListRegex(options);

                    if (typeof target === 'string') {
                        targets.push(target);
                    } else if (typeof target === 'object') {
                        util.eachRecursive(target, function (val) {
                            if (typeof val === 'string') {
                                targets.push(val);
                            }
                        });
                    }

                    var t = targets.join(' '),
                            firstMatch = t.match(regex) || [],
                            fullMatch,
                            ssregex;
                    if (options.substrings !== 'lite') {
                        return firstMatch;
                    } else {
                        ssregex = getSubStringListRegex(options);
                        fullMatch = firstMatch.concat(t.match(ssregex) || []);
                    }

                    return fullMatch;
                },
                purify: function (target, options) {
                    options = options || {};

                    var matches = [],
                            fields = options.fields || (target instanceof Object ? Object.keys(target) : []),
                            result;

                    if (options.replace && options.map) {
                        options.replacementMap = {};
                        options.nextReplacementIndex = 0;
                    }

                    if (typeof target === 'string') {
                        return purifyString(target, options);
                    } else if (typeof target === 'object') {
                        fields.forEach(function (field) {

                            // TODO: Use better recursive checking, make DRYer
                            if (typeof target[field] === 'string') {

                                result = purifyString(target[field], options);
                                target[field] = result[0];
                                matches = matches.concat(result[1]);

                            } else if (typeof target[field] === 'object') {
                                util.eachRecursive(target[field], function (val, key, root) {
                                    if (options.fields && options.fields.indexOf(key) === -1) {
                                        return;
                                    }

                                    if (typeof val === 'string') {
                                        result = purifyString(val, options);
                                        root[key] = result[0];
                                        matches = matches.concat(result[1]);
                                    }

                                });
                            }
                        });

                        return [target, matches];
                    }
                }
            };

            var filtered = profanity.purify(inputs.message, {substrings: "lite"});
            sails.log.silly(filtered);
            return exits.success(filtered[0]);
        } catch (e) {
            return exits.error(e);
        }
    }


};

/*
 Copyright (C) 2014, 2017 Kano Computing Ltd.
 License: http://opensource.org/licenses/MIT The MIT License (MIT)
 */

var DEFAULT_REPLACEMENTS = [
    'bunnies',
    'butterfly',
    'kitten',
    'love',
    'gingerly',
    'flowers',
    'puppy',
    'joyful',
    'rainbows',
    'unicorn'
];

var DEFAULT_PATTERN = listToPattern(sails.config.custom.profanity.main);

var DEFAULT_SUBSTRING_PATTERN = listToPattern(sails.config.custom.profanity.substring);

function listToPattern(list) {
    // we want to treat all characters in the word as literals, not as regex specials (e.g. shi+)
    function escapeRegexChars(word) {
        return word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    return '(' + list.map(escapeRegexChars).join('|') + ')';
}

function getListRegex(options) {
    var pattern = DEFAULT_PATTERN;

    options = options || {};

    if (options.forbiddenList) {
        pattern = listToPattern(options.forbiddenList);
    }

    if (!options.substrings || options.substrings === 'lite') {
        pattern = '\\b' + pattern + '\\b';
    }

    return new RegExp(pattern, 'gi');
}

function getSubStringListRegex(options) {
    var pattern = DEFAULT_SUBSTRING_PATTERN;

    options = options || {};

    if (options.subStringList) {
        pattern = listToPattern(options.subStringList);
    }

    return new RegExp(pattern, 'gi');
}

function matchCase(model, string) {
    var char = model[0];

    // Is the first character an uppercase letter?
    if (char === char.toUpperCase() && char !== char.toLowerCase()) {
        string = string.charAt(0).toUpperCase() + string.slice(1);
    }

    return string;
}

function purifyString(str, options) {
    options = options || {};

    var matches = [],
            purified,
            regex = getListRegex(options),
            replacementsList = options.replacementsList || DEFAULT_REPLACEMENTS,
            replace = options.replace || false,
            map = options.map || false,
            obscureSymbol = options.obscureSymbol || '*';

    purified = str.replace(regex, function (val) {
        matches.push(val);

        if (replace) {
            if (map) {
                if (!options.replacementMap[val]) {
                    options.replacementMap[val] = matchCase(val, replacementsList[options.nextReplacementIndex++]);
                    options.nextReplacementIndex %= replacementsList.length;
                }

                return options.replacementMap[val];
            }
            return matchCase(val, replacementsList[Math.floor(Math.random() * replacementsList.length)]);
        }

        var str = val.substr(0, 1);

        for (var i = 0; i < val.length - 2; i += 1) {
            str += obscureSymbol;
        }

        return str + val.substr(-1);
    });

    return [purified, matches];
}
