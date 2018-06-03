/* global sails, Meta */

module.exports = {

    friendlyName: 'Meta / Get',

    description: 'Get the current Meta. If the request is a socket, subscribe to meta changes.',

    inputs: {
        display: {
            type: 'string',
            allowNull: true,
            description: 'Displays which we need to log their connection will pass a display input.'
        },

        djcontrols: {
            type: 'string',
            allowNull: true,
            description: 'DJ Controls making a request to this endpoint will past the computer hostname.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller meta/get called.');
        if (this.req.isSocket)
        {
            sails.sockets.join(this.req, 'meta');
            sails.log.verbose('Request was a socket. Joining meta.');

            // WORK ON THIS: find a better way to log display connections rather than in the meta controller
            if (inputs.display !== null)
            {
                await sails.helpers.recipients.add(sails.sockets.getId(this.req), inputs.display, 'display', inputs.display);
                sails.sockets.join(this.req, 'display-refresh');
                sails.log.verbose('Request was a socket with a display parameter. Joined display-refresh.');
            }

            // WORK ON THIS: find a better way to log djcontrols connections rather than in the meta controller
            if (inputs.djcontrols !== null)
            {
                await sails.helpers.recipients.add(sails.sockets.getId(this.req), inputs.djcontrols, 'computers', inputs.djcontrols);
            }
        }
        return exits.success(Meta['A']);
    }


};
