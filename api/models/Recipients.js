/* global sails, Recipients */

/**
 * Recipients.js
 *
 * @description :: This model contains a collection of recipients that can receive messages.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

    datastore: 'memory',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        name: {
            type: 'string'
        },

        group: {
            type: 'string',
            isIn: ['system', 'website', 'display', 'computers']
        },

        label: {
            type: 'string'
        },

        status: {
            type: 'number',
            min: 0,
            max: 5
        },

        time: {
            type: 'ref',
            columnType: 'datetime'
        }
    },

    sockets: [], // For recipients connecting via sockets, we will pair the sockets with the Recipients.ID in the format: [{Recipients.ID: [array, of, socket, IDs]}]
    /**
     * Change recipients
     * @constructor
     * @param {Array} array - Array containing objects of recipients to change {name: 'key', group: 'group', label: 'friendly name', status: 5}.
     */

    changeRecipients: function (array) {
        return new Promise(async (resolve, reject) => {
            var moment = require('moment');
            try {
                await sails.helpers.asyncForEach(array, function (recipient, index) {
                    return new Promise(async (resolve2, reject2) => {
                        var criteria = {name: recipient.name, group: recipient.group, label: recipient.label, status: recipient.status};
                        if (recipient.status !== 0)
                            criteria.time = moment().toISOString();

                        // Find or create the status record
                        var record = await Recipients.findOrCreate({name: recipient.name}, criteria)
                                .intercept((err) => {
                                    return resolve2();
                                });

                        // Search to see if any changes are made to the status; we only want to update if there is a change.
                        var updateIt = false;
                        for (var key in criteria)
                        {
                            if (criteria.hasOwnProperty(key))
                            {
                                if (criteria[key] !== record[key])
                                {
                                    // We don't want to fetch() on time-only updates; this will flood websockets
                                    if (!updateIt && key === 'time')
                                    {
                                        updateIt = 2;
                                    } else {
                                        updateIt = 1;
                                    }
                                }
                            }
                        }
                        if (updateIt === 1)
                        {
                            await Recipients.update({name: recipient.name}, criteria)
                                    .intercept((err) => {
                                        return reject(err);
                                    })
                                    .fetch();
                        } else if (updateIt === 2) {
                            await Recipients.update({name: recipient.name}, criteria)
                                    .intercept((err) => {
                                        return reject(err);
                                    });
                        }
                        return resolve2();
                    });
                });
                return resolve();
            } catch (e) {
                return reject(e);
            }
        });
    },

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        var data = {insert: newlyCreatedRecord};
        sails.sockets.broadcast('recipients', 'recipients', data);
        return proceed();
    },

    afterUpdate: function (updatedRecord, proceed) {
        var data = {update: updatedRecord};
        sails.sockets.broadcast('recipients', 'recipients', data);
        return proceed();
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = {remove: destroyedRecord.ID};
        sails.sockets.broadcast('recipients', 'recipients', data);
        return proceed();
    }

};

