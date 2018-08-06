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
            sails.config.custom.profanity.forEach(function (word) {
                var numbers = getIndicesOf(word, inputs.message, false);
                if (numbers.length > 0)
                {
                    numbers.forEach(function (number) {
                        for (var i = 0; i < word.length; i++)
                        {
                            if (i !== 0 && i !== (word.length - 1))
                                inputs.message = setCharAt(inputs.message, number + i, "*");
                        }
                    });
                }
            });
            return exits.success(inputs.message);
        } catch (e) {
            return exits.error(e);
        }
    }


};

function getIndicesOf(searchStr, str, caseSensitive) {
    var searchStrLen = searchStr.length;
    if (searchStrLen == 0) {
        return [];
    }
    var startIndex = 0, index, indices = [];
    if (!caseSensitive) {
        str = str.toLowerCase();
        searchStr = searchStr.toLowerCase();
    }
    while ((index = str.indexOf(searchStr, startIndex)) > -1) {
        indices.push(index);
        startIndex = index + searchStrLen;
    }
    return indices;
}

function setCharAt(str, index, chr) {
    if (index > str.length - 1)
        return str;
    return str.substr(0, index) + chr + str.substr(index + 1);
}