/* global sails */

const sanitizeHtml = require('sanitize-html');

module.exports = {


  friendlyName: 'sails.helpers.sanitize',


  description: 'Remove prohibited HTML tags, and fix any broken ones.',


  inputs: {
      text: {
          type: 'string',
          defaultsTo: '',
          description: 'The string to sanitize.'
      }
  },


  fn: async function (inputs, exits) {
      sails.log.debug(`helper sanitize called.`);
      sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
      
      try {
          var clean = sanitizeHtml(inputs.text, sails.config.custom.sanitize);
          
          // Don't leave &amp;s etc
          clean = decodeURI(clean);
          
          return exits.success(clean);
      } catch (e) {
          return exits.error(e);
      }

  }


};

