/* global sails, Recipients */

module.exports = {

    friendlyName: 'Recipients / Add-computers',

    description: 'Registers a DJ Controls recipient as online. This is to be used with internal recipients; web/mobile public recipients should use recipients / add-web.',

    inputs: {
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller recipients/add-computers called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
        try {
            // Must be a websocket request
            if (!this.req.isSocket)
                return exits.error(new Error('This controller requires a websocket.'));

            // Add the recipient
            var label = await sails.helpers.recipients.add(sails.sockets.getId(this.req), this.req.payload.host, 'computers', inputs.host);
            
            // Return the host label object
            return exits.success({label: label});

        } catch (e) {
            return exits.error(e);
        }

    }


};

