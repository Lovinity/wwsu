module.exports = {

    friendlyName: 'Status / Get',

    description: 'Get the current status of all subsystems. If socket request, subscribe to receiving status changes.',

    inputs: {

    },

    exits: {

    },

    fn: async function (inputs, exits) {
        if (this.req.isSocket)
            sails.sockets.join(this.req, 'status');
        return exits.success(Status['A']);
    }


};
