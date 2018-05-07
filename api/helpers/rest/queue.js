var needle = require('needle');
var parser = require('xml2json');

module.exports = {

    friendlyName: 'rest / Queue',

    description: 'Get the current RadioDJ queue.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        var endstring = ''; // appends at the end of a REST call, say, if arg was supplied
        needle('get', Meta['A'].radiodj + '/p?auth=' + sails.config.custom.restauth)
                .then(async function (resp) {
                    try {
                        var json2 = parser.toJson(resp.body);
                        return exits.success(json2);
                    } catch (e) {
                        sails.log.error(e);
                        return exits.error();
                    }
                })
                .catch(function (err) {
                    sails.log.error(err);
                    return exits.error();
                });
    }


};

