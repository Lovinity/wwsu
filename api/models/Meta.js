/**
 * Meta.js
 *
 * @description :: Meta manages the metadata of what is playing on WWSU Radio.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

// WORK ON THIS MORE
module.exports = {
    datastore: 'nodebase',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        state: {
            type: 'string'
        },

        dj: {
            type: 'string',
            allowNull: true
        },

        track: {
            type: 'string',
            allowNull: true
        },

        trackstamp: {
            type: 'string',
            allowNull: true
        },

        topic: {
            type: 'string',
            allowNull: true
        },

        radiodj: {
            type: 'string'
        },

        djcontrols: {
            type: 'string'
        },

        webchat: {
            type: 'boolean'
        }

    },

    // API NOTE: Do not modify any of these directly; use the changeMeta function instead.
    A: {
        state: 'unknown', // State of the WWSU system
        dj: '', // If someone is on the air, name of the host
        track: '', // Currently playing track either in automation or manually logged
        trackstamp: null, // Use moment.toISOString() when changing in changeMeta! If you directly store a moment instance here, database updating will fail
        topic: '',
        stream: '',
        radiodj: '',
        djcontrols: '',
        line1: '',
        line2: '',
        percent: 0,
        time: '',
        listeners: 0,
        listenerpeak: 0,
        queueLength: 0,
        breakneeded: false,
        status: 1,
        webchat: true
    },
    history: [], // track history

    changeMeta: function (key, theMeta) {
        // Cancel the function if there's actually no change
        if (typeof Meta['A'][key] == 'undefined' || Meta['A'][key] === theMeta)
            return null;

        Meta['A'][key] = theMeta;
        var temp = {};
        temp[key] = Meta['A'][key];

        // Try updating the meta in the database
        try {
            if (key in Meta.attributes)
                Meta.update({ID: 1}).set(temp).exec();
        } catch (e) {
        }

        // If we're changing stream meta, push to history array, and send an API call to the stream to update the meta on the stream.
        if (key == 'stream')
        {
            Meta.history.unshift(theMeta);
            Meta.history = Meta.history.slice(0, 5);
            // TODO: Put stream metadata updating API query here
        }

        sails.sockets.broadcast('meta', 'meta', temp);
    }
};

