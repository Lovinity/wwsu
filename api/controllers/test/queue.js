module.exports = {


  friendlyName: 'Queue',


  description: 'Queue test.',


  inputs: {

  },


  exits: {

  },


  fn: async function (inputs, exits) {

    await sails.helpers.songs.queue([null], 'Top', 1)
    return exits.success();

  }


};
