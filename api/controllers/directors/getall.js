module.exports = {

    friendlyName: 'Directors / GetAll',

    description: 'Get all the WWSU directors and their current presence. If request is a socket, subscribe socket to receive changes to director presence.',

    inputs: {

    },

    exits: {

    },

    fn: async function (inputs, exits) {
        if (this.req.isSocket)
            sails.sockets.join(this.req, 'directors');
        return exits.success(await Directors.loadDirectors(false));
    }


};
