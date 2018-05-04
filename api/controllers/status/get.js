module.exports = {

    friendlyName: 'Status / Get',

    description: 'Get the current status of all subsystems. If socket request, subscribe to receiving status changes.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        if (this.req.isSocket)
            sails.sockets.join(this.req, 'status');
        var records = await Status.find()
                .intercept((err) => {
                    sails.log.error(err);
                    return exits.error();
                });
        return exits.success(records);
    }


};
