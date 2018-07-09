/* global Recipients */

module.exports = {


  friendlyName: 'Recipient socket',


  description: '',


  inputs: {

  },


  fn: async function (inputs, exits) {

    return exits.success(Recipients.sockets);

  }


};
