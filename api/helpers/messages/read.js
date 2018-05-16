var moment = require('moment');

module.exports = {

    friendlyName: 'Messages / Read',

    description: 'Retrieve applicable messages sent within the last hour. Do not include emergency messages.',

    inputs: {
        host: {
            type: 'string',
            required: true,
            description: 'Host ID of the client retrieving messages.'
        },
        ip: {
            type: 'string',
            defaultsTo: '10.0.0.1',
            description: 'The IP address of the client'
        },
        socket: {
            type: 'string',
            allowNull: true,
            description: 'The ID of the websocket.'
        }
    },

    fn: async function (inputs, exits) {
        var searchto = moment().subtract(1, 'hours').toDate(); // Get messages sent within the last hour
        // First, grab data pertaining to the host that is retrieving messages
        var thehost = await Hosts.findOrCreate({host: inputs.host}, {host: inputs.host, friendlyname: inputs.host})
                .intercept((err) => {
                    return exits.error(err);
                });
        // Do socket related maintenance
        if (typeof inputs.socket != 'undefined' && inputs.socket !== null)
        {
            for (var key in Messages.visitors) {
                if (Messages.visitors.hasOwnProperty(key)) {
                    if (Messages.visitors[key].host === inputs.host)
                    {
                        delete Messages.visitors[key];
                    }
                }
            }
            Messages.visitors[inputs.socket] = {group: 'computers', name: thehost.friendlyname, ip: inputs.ip || 'NA', time: moment(), type: 2, host: inputs.host};
            var temp = {computers: {}};
            temp.computers[inputs.host] = {label: thehost.friendlyname, status: 2};
        }
        // Get messages
        var records = await Messages.find({status: 'active', or: [{createdAt: {'>': searchto}}, {to: 'emergency'}]})
                .intercept((err) => {
                    return exits.error(err);
                });
        if (typeof records == 'undefined' || records.length == 0)
        {
            return exits.success([]);
        } else {
            return exits.success(records);
        }

    }


};

