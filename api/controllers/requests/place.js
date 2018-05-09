module.exports = {

    friendlyName: 'Requests / Place',

    description: 'Place a request.',

    inputs: {
        ID: {
            required: true,
            type: 'number',
            description: 'ID number of the song to request.'
        },

        name: {
            type: 'string',
            defaultsTo: 'anonymous',
            description: 'Name provided of the person making the request.'
        },

        message: {
            type: 'string',
            defaultsTo: '',
            description: 'Message provided regarding the request.'
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        try {
            var response = await Requests.place(inputs.ID, this.req.ip, inputs.name, inputs.message);
            return exits.success(response.HTML);
        } catch (e) {
            sails.log.error(e);
            return exits.error();
        }
    }


};
