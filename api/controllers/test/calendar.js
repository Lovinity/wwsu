module.exports = {


  friendlyName: 'Calendar',


  description: 'Calendar test.',


  inputs: {

  },


  exits: {

  },


  fn: async function (inputs, exits) {

    return exits.success(Calendar.calendar);

  }


};
