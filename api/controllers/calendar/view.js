module.exports = {


  friendlyName: 'Calendar / View',


  description: 'Loads the HTML calendar page',


  inputs: {

  },


    exits: {
        success: {
            responseType: 'view',
            viewTemplatePath: 'calendar/home'
        }
    },


  fn: async function (inputs, exits) {

    return exits.success();

  }


};
