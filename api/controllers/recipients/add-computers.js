/* global sails, Recipients */

module.exports = {

    friendlyName: 'Recipients / Add-computers',

    description: 'Registers a DJ Controls recipient as online. This is to be used with internal recipients; web/mobile public recipients should use recipients / add-web.',

    inputs: {
        host: {
            type: 'string',
            required: true,
            description: 'Name of the host being registered.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller recipients/add-computers called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
        try {
            if (!this.req.isSocket)
                return exits.error(new Error('This controller requires a websocket.'));

            var label = await sails.helpers.recipients.add(sails.sockets.getId(this.req), inputs.host, 'computers', inputs.host);
            sails.sockets.join(this.req, 'show-stats');
            sails.log.verbose('Request was a socket. Joining show-stats.');
            return exits.success({label: label});

        } catch (e) {
            return exits.error(e);
        }

    }


};

