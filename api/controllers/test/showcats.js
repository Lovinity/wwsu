module.exports = {

    friendlyName: 'Showcats',

    description: 'Showcats test.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        if (typeof sails.config.custom.showcats[Meta['A'].show] !== 'undefined')
            {await sails.helpers.songs.queue([sails.config.custom.showcats[Meta['A'].show]['Show Returns']], 'Bottom', 1);}
        return exits.success(sails.config.custom.showcats);

    }


};
