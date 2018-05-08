/**
 * Messages.js
 *
 * @description :: Messages is a collection of all the messages sent through the DJ Controls messaging system.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    datastore: 'nodebase',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        status: {
            type: 'string',
            defaultsTo: 'active'
        },

        from: {
            type: 'string'
        },

        from_friendly: {
            type: 'string'
        },
        from_IP: {
            type: 'string',
            defaultsTo: 'Not Specified'
        },
        to: {
            type: 'string'
        },

        to_friendly: {
            type: 'string'
        },

        message: {
            type: 'string'
        },

    },

    visitors: {}, // Used to track which people are online for messaging


    /**
     * Retrieve applicable messages sent within the last hour. Do not include emergency messages.
     * @constructor
     * @param {object} opts - Object of options
     * @param {string} opts.host - Host ID of the client retrieving messages
     * @param {string} opts.ip - The IP address of the client (optional)
     * @param {string} opts.socket - The ID of the websocket (optional)
     */

    read: function (opts) {
        return new Promise(async (resolve, reject) => {
            if (typeof opts.host == 'undefined') // No host? Cannot continue!
                reject(new Error('Missing parameter: host'));
            var moment = require('moment');
            var searchto = moment().subtract(1, 'hours').toDate(); // Get messages sent within the last hour
            // First, grab data pertaining to the host that is retrieving messages
            var thehost = await Hosts.findOrCreate({host: opts.host}, {host: opts.host, friendlyname: opts.host})
                    .intercept((err) => {
                        reject(err);
                    });
            // Do socket related maintenance
            if (typeof opts.socket != 'undefined')
            {
                for (var key in Messages.visitors) {
                    if (Messages.visitors.hasOwnProperty(key)) {
                        if (Messages.visitors[key].host === opts.host)
                        {
                            delete Messages.visitors[key];
                            sails.sockets.broadcast('message-user', 'message-user-delete', key);
                        }
                    }
                }
                Messages.visitors[opts.socket] = {group: 'computers', name: thehost.friendlyname, ip: opts.ip || 'NA', time: moment(), type: 2, host: opts.host};
                var temp = {computers: {}};
                temp.computers[opts.host] = {label: thehost.friendlyname, status: 2};
                sails.sockets.broadcast('message-user', 'message-user', temp);
            }
            // Get messages
            var records = await Messages.find({status: 'active', createdAt: {'>': searchto}, to: {'!=': 'emergency'}})
                    .intercept((err) => {
                        reject(err);
                    });
            if (typeof records == 'undefined' || records.length == 0)
            {
                resolve([]);
            } else {
                resolve(records);
            }
        });
    },

    /**
     * Retrieve applicable messages for website visitors.
     * @constructor
     * @param {object} opts - Object of options
     * @param {string} opts.host - Host ID of the client retrieving messages
     */

    readWeb: function (opts) {
        return new Promise(async (resolve, reject) => {
            if (typeof opts.host == 'undefined')
                reject(new Error('Missing parameter: host'));
            var moment = require('moment');
            var searchto = moment().subtract(1, 'hours').toDate();
            var records = await Messages.find(
                    {
                        status: 'active',
                        createdAt: {'>': searchto},
                        or: [
                            {to: ['website', `website-${opts.host}`]},
                            {from: {'startsWith': 'website'}, to: 'DJ'},
                            {from: `website-${opts.host}`, to: 'DJ-private'}
                        ]
                    })
                    .intercept((err) => {
                        reject(err);
                    });
            if (typeof records == 'undefined' || records.length == 0)
            {
                resolve([]);
            } else {
                resolve(records);
            }
        });
    },

    /**
     * Retrieve active emergency / technical issue messages
     */
    readEmergencies: function () {
        return new Promise(async (resolve, reject) => {
            var records = await Messages.find({to: 'emergency', status: 'active'})
                    .intercept((err) => {
                        reject(err);
                    });
            if (typeof records == 'undefined' || records.length == 0)
            {
                resolve([]);
            } else {
                resolve(records);
            }
        });
    },

    /**
     * Retrieve a list of all the recipients that we can send and receive messages to/from.
     */

    findClients: function () {
        return new Promise(async (resolve, reject) => {
            var moment = require('moment');
            var searchto = moment().subtract(1, 'hours').toISOString();
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
                        reject(err);
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
                        reject(err);
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
                        reject(err);
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
            resolve(users);
        });
    },
    /**
     * Send a message from a WWSU client.
     * @constructor
     * @param {object} opts - Object of Messages attributes
     */
    send: function (opts) {
        return new Promise(async (resolve, reject) => {
            try {
                opts.message = await sails.helpers.filterProfane(opts.message);
                // First, grab data pertaining to the host that is retrieving messages
                var stuff = await Hosts.findOrCreate({host: opts.from}, {host: opts.from, friendlyname: opts.from})
                        .intercept((err) => {
                            reject(err);
                        });
                opts.from_friendly = stuff.friendlyname;
                var records = await Messages.create(opts).fetch()
                        .intercept((err) => {
                            reject(err);
                        });
                if (!records)
                {
                    reject(new Error('Internal error: Could not save message in database.'));
                } else {
                    var records2 = records;
                    delete records2.from_IP; // We do not want to publish IP addresses publicly!
                    // Broadcast the message over web sockets
                    if (opts.to == 'emergency')
                    {
                        sails.sockets.broadcast('message-emergency', 'message-emergency', {status: 'success', response: [records2]});
                    } else if (opts.to.startsWith("website-") || opts.to == 'website')
                    {
                        sails.sockets.broadcast(opts.to, 'webmessage', {status: 'success', response: [records2]});
                        sails.sockets.broadcast('message-message', 'message-message', {status: 'success', response: [records2]});
                    } else {
                        sails.sockets.broadcast('message-message', 'message-message', {status: 'success', response: [records2]});
                    }
                    resolve();
                }
            } catch (e) {
                reject(e);
            }
        });
    },

    /**
     * Send a message from a website client.
     * @constructor
     * @param {object} opts - Object of options
     * @param {string} opts.host - The host ID of the client sending the message
     * @param {string} opts.message - The message to be sent
     * @param {string} opts.from_IP - The IP address of the client sending the message
     * @param {string} opts.nickname - The nickname of the client (optional)
     * @param {boolean} opts.private - If true, the message is to be private / visible only to the DJ
     */

    sendWeb: function (opts) {
        return new Promise(async (resolve, reject) => {
            var moment = require('moment');
            var searchto = moment().subtract(1, 'minutes').toDate();

            // Filter profanity
            try {
                opts.message = await sails.helpers.filterProfane(opts.message);
            } catch (e) {
                reject(e);
            }
            var theid = opts.host;
            // If no nickname provided, use host as the nickname
            if (opts.nickname === null || opts.nickname == '')
            {
                opts.nickname = theid;
            }
            var records = null;
            var check = await Messages.find({from_IP: opts.from_IP, createdAt: {'>': searchto}})
                    .intercept((err) => {
                        reject(err);
                    });
            if (check.length > 0)
                reject(new Error('Website visitors are only allowed to send one message per minute.'));
            // Create and broadcast the message, depending on whether or not it was private
            if (typeof opts.private != 'undefined' && opts.private)
            {
                records = await Messages.create({status: 'active', from: `website-${theid}`, from_friendly: `Web (${opts.nickname})`, from_IP: opts.from_IP, to: 'DJ-private', to_friendly: 'DJ private', message: opts.message}).fetch()
                        .intercept((err) => {
                            reject(err);
                        });
                if (!records)
                    reject(new Error('Internal Error: Could not save message to the database.'));
                delete records.from_IP; // We do not want to broadcast IP addresses!
                sails.sockets.broadcast('website-' + theid, 'webmessage', {status: 'success', response: [records]});
            } else {
                records = await Messages.create({status: 'active', from: `website-${theid}`, from_friendly: `Web (${opts.nickname})`, from_IP: opts.from_IP, to: 'DJ', to_friendly: 'DJ', message: opts.message}).fetch()
                        .intercept((err) => {
                            reject(err);
                        });
                if (!records)
                    reject(new Error('Internal Error: Could not save message to the database'));
                delete records.from_IP; // We do not want to broadcast IP addresses!
                sails.sockets.broadcast('website', 'webmessage', {status: 'success', response: [records]});
            }
            if (records)
                sails.sockets.broadcast('message-message', 'message-message', {status: 'success', response: [records]});
            resolve();
        });
    },

    /**
     * Virtually delete a message.
     * @constructor
     * @param {integer} id - ID of the message to mark for deletion
     */

    delete: function (id) {
        return new Promise(async (resolve, reject) => {
            var records = await Messages.update({ID: id}, {status: 'deleted'}).fetch()
                    .intercept((err) => {
                        reject(err);
                    });
            if (!records || records.length == 0)
            {
                resolve();
            } else {
                var type = 'message';
                if (records[0].to == 'emergency')
                    type = 'emergency';
                sails.sockets.broadcast('message-delete', 'message-delete', {type: type, id: id});
                resolve();
            }
        });
    }

};

