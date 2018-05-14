var moment = require('moment');

module.exports = {

    friendlyName: 'messages / findRecipients',

    description: 'Get a list of recipients that can receive messages, both clients and internal.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        var searchto = moment().subtract(1, 'hours').toDate();
        // Hard-coded recipients with special purposes, plus some groups.
        var users = {
            system: {
                emergency: {label: 'Technical Issues', status: 0},
                trackrequests: {label: 'Track Requests', status: 0}
            },
            website: {
                website: {label: 'Web Public', status: 5}
            },
            computers: {
            },
            display: {
            }
        };
        // No web chat? Mark the status of web public as offline.
        if (!Meta['A'].webchat)
            users.website['website'].status = 0;
        // Include all hosts from the database in the list of recipients
        var records = await Hosts.find()
                .intercept((err) => {
                    return exits.error(err);
                });
        if (records)
        {
            records.forEach(function (record) {
                users.computers[record.host] = {label: `${record.friendlyname}`, status: 0};
            });
        }
        // Include all hosts that have sent a message within the last hour
        var records2 = await Messages.find({or: [{createdAt: {'>': searchto}}, {to: 'emergency'}]})
                .intercept((err) => {
                    return exits.error(err);
                });
        if (typeof records2 == 'undefined' || records2.length == 0)
        {
        } else {
            records2.forEach(function (record2, index) {
                if (typeof users[record2.from] == 'undefined' && record2.from.startsWith('website-'))
                    users.website[record2.from] = {label: `${record2.from_friendly}`, status: 0};
                if (typeof users[record2.to] == 'undefined' && record2.to.startsWith('website-'))
                    users.website[record2.to] = {label: `${record2.to_friendly}`, status: 0};
                if (record2.to == 'emergency')
                    users.system['emergency'].status = 1;
            });
        }
        // Determine if there is a track request pending, and if so, set the status of requests recipient accordingly.
        var records3 = await Requests.find({played: 0})
                .intercept((err) => {
                    return exits.error(err);
                });
        if (typeof records3 == 'undefined' || records3.length == 0)
        {
        } else {
            if (records3.length > 0)
                users.system['trackrequests'].status = 4;
        }
        // Clean up our list of recipients
        for (var key in Messages.visitors) {
            if (Messages.visitors.hasOwnProperty(key)) {
                if (!(key in users))
                {
                    if (Messages.visitors[key].group === 'computers' && !(Messages.visitors[key].host in users))
                    {
                        users[Messages.visitors[key].group][Messages.visitors[key].host] = {label: `${Messages.visitors[key].name}`, status: Messages.visitors[key].type};
                    } else if ((Messages.visitors[key].group === 'website' && moment(Messages.visitors[key].time).isAfter(moment().subtract(1, 'hours')))) {
                        users[Messages.visitors[key].group][Messages.visitors[key].host] = {label: `${Messages.visitors[key].name}`, status: Messages.visitors[key].type};
                    } else if (Messages.visitors[key].group !== 'website')
                    {
                        users[Messages.visitors[key].group][key] = {label: `${Messages.visitors[key].name}`, status: Messages.visitors[key].type};
                    }
                } else if (Messages.visitors[key].host in users && Messages.visitors[key].group === 'computers')
                {
                    users[Messages.visitors[key].group][Messages.visitors[key].host] = {label: `${Messages.visitors[key].name}`, status: Messages.visitors[key].type}
                }
            }
        }
        return exits.success(users);
    }


};

