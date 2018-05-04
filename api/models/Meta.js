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
        topic: '', // If the DJ specified a show topic, this is the topic.
        stream: '', // Meta for the internet radio stream
        radiodj: '', // REST IP of the RadioDJ instance currently in control
        djcontrols: '', // Hostname of the computer in which has activated the most recent live/sports/remote broadcast via DJ Controls
        line1: '', // First line of meta for display signs
        line2: '', // Second line of meta for display signs
        percent: 0, // Integer or float between 0 and 100 indicating how far in the current track in automation we are, for display signs
        time: '', // Human readable date and time for display signs
        listeners: 0, // Number of current online listeners
        listenerpeak: 0, // Number of peak online listeners
        queueLength: 0, // Amount of audio queued in radioDJ in seconds (can be a float)
        breakneeded: false, // If the current DJ needs to take the FCC required top of the hour break, this will be true
        status: 4, // Overall system status: 1 = major outage, 2 = partial outage, 3 = minor issue, 4 = rebooting, 5 = operational
        webchat: true // Set to false to restrict the ability to send chat messages through the website
    },
    history: [], // track history array

    /**
     * Change a meta attribute
     * @constructor
     * @param {string} key - The attribute to change... is a key in Meta['A'].
     * @param {ref} theMeta - The value to be set to the key.
     */

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

