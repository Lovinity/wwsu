module.exports = {

    friendlyName: 'Requests / Get',

    description: 'Get requests.',

    inputs: {
        offset: {
            type: 'number',
            defaultsTo: 0
        }
    },

    fn: async function (inputs, exits) {
       try {
           var response = await sails.helpers.requests.get(inputs.offset);
           return exits.success(response);
       } catch (e) {
           saols.log.error(e);
           return exits.error();
       }

    }


};
