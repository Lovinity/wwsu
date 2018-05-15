module.exports = {


  friendlyName: 'Requests / Queue',


  description: 'Queue or play a request.',


  inputs: {
      ID: {
          type: 'number',
          required: true,
          description: 'The Request ID number.'
      }
  },


  fn: async function (inputs, exits) {

        try {
            var response = await sails.helpers.requests.queue(1, false, false, inputs.ID);
            return exits.success(response);
        } catch (e) {
            sails.log.error(e);
            return exits.error();
        }

  }


};
