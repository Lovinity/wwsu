module.exports = {

    friendlyName: 'Playlist tracks',

    description: '',

    inputs: {

    },

    exits: {

    },

    fn: async function (inputs, exits) {
        await sails.helpers.error.post();
        return exits.success(Playlists.active.tracks);

    }


};
