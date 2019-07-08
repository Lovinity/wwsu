/**
 * Requests.js
 *
 * @description :: Track requests for RadioDJ.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    datastore: 'radiodj',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        songID: {
            type: 'number'
        },

        username: {
            type: 'string'
        },

        userIP: {
            type: 'string',
            maxLength: 50
        },

        message: {
            type: 'string'
        },

        requested: {
            type: 'ref',
            columnType: 'datetime'
        },

        played: {
            type: 'number',
            min: 0,
            max: 1
        }

    },

    pending: [], // Store track ID numbers in memory so that we don't need to query the Requests table every second and see if a request is being played.

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        var data = {insert: newlyCreatedRecord};
        sails.log.silly(`requests socket: ${data}`);
        data.insert.trackname = `Unknown track`;
        Songs.findOne({ID: newlyCreatedRecord.songID})
                .then(((record2) => {
                    sails.log.silly(`Song: ${record2}`);
                    if (record2)
                        {data.insert.trackname = `${record2.artist} - ${record2.title}`;}
                    sails.sockets.broadcast('requests', 'requests', data);
                    return proceed();
                }))
                .catch(() => {
                    sails.sockets.broadcast('requests', 'requests', data);
                    return proceed();
                });
    },

    afterUpdate: function (updatedRecord, proceed) {
        var data = {update: updatedRecord};

        // Since we update played to 1, instead of outright deleting a request, check for that.
        if (updatedRecord.played === 1)
        {
            data = {remove: updatedRecord.ID};
            sails.log.silly(`requests socket: ${data}`);
            sails.sockets.broadcast('requests', 'requests', data);
            return proceed();
        } else {
            data.update.trackname = `Unknown track`;
            Songs.findOne({ID: updatedRecord.songID})
                    .then(((record2) => {
                        sails.log.silly(`Song: ${record2}`);
                        if (record2)
                            {data.update.trackname = `${record2.artist} - ${record2.title}`;}
                        sails.log.silly(`requests socket: ${data}`);
                        sails.sockets.broadcast('requests', 'requests', data);
                        return proceed();
                    }))
                    .catch(() => {
                        sails.log.silly(`requests socket: ${data}`);
                        sails.sockets.broadcast('requests', 'requests', data);
                        return proceed();
                    });
        }
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = {remove: destroyedRecord.ID};
        sails.log.silly(`requests socket: ${data}`);
        sails.sockets.broadcast('requests', 'requests', data);
        return proceed();
    }

};

