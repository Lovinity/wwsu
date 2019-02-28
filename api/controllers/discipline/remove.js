module.exports = {


  friendlyName: 'Discipline / Remove',


  description: 'Remove a discipline record from the system.',


  inputs: {
      ID: {
          type: 'number',
          required: true,
          description: "The ID of the discipline record to remove."
      }
  },


  exits: {

  },


  fn: async function (inputs, exits) {
      sails.log.debug(`Controller discipline/remove called.`);
      
      try {
          await Discipline.destroy({ID: inputs.ID}).fetch();
          
          return exits.success();
      } catch (e) {
          return exits.error(e);
      }
  }


};
