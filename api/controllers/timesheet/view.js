/* global sails */

module.exports = {


  friendlyName: 'Timesheet / View',


  description: 'Loads the HTML page of director timesheets',


  inputs: {

  },


    exits: {
        success: {
            responseType: 'view',
            viewTemplatePath: 'timesheet/home'
        }
    },


  fn: async function (inputs, exits) {
        sails.log.debug(`Controller timesheet/view called.`);
    return exits.success();

  }


};