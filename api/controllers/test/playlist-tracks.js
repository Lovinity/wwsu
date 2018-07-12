/* global Playlists */

module.exports = {


  friendlyName: 'Playlist tracks',


  description: '',


  inputs: {

  },


  exits: {

  },


  fn: async function (inputs, exits) {

    return exits.success(Playlists.active.tracks);

  }


};
