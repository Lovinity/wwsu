module.exports = {


  friendlyName: 'Requests pending',


  description: '',


  inputs: {

  },


  exits: {

  },


  fn: async function (inputs, exits) {

    return exits.success(Requests.pending);

  }


};
