/**
 * Discipline.js
 *
 * @description :: Discipline manages bans on website and mobile app users.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    datastore: 'nodebase',
    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true
        },

        active: {
            type: 'number',
            min: 0,
            max: 1
        },

        IP: {
            type: 'string'
        },

        action: {
            type: 'string'
        },

        message: {
            type: 'string'
        }
    },

    /**
     * Bans a website or mobile app user until the currently live show or broadcast ends.
     * @constructor
     * @param {string} host - Unique ID of the user to ban.
     */
    showban: function (host) {
        return new Promise(async (resolve, reject) => {
            try {
                Discipline.massDeleteWebMessages(host);
                var record = await Discipline.create({active: 1, IP: host, action: 'showban', message: `The website user was show-banned by ${Meta['A'].dj}`}).fetch();
                sails.sockets.broadcast(host, 'webmessage', {status: 'denied', response: `Your interactions with WWSU have been placed under review. Please email engineer@wwsu1069.org for further assistance. Please include the following reference number(s) in your email: ${record.ID}`});
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    },

    /**
     * Bans a website or mobile app user for 24 hours.
     * @constructor
     * @param {string} host - Unique ID of the user to ban.
     */
    dayban: function (host) {
        return new Promise(async (resolve, reject) => {
            try {
                Discipline.massDeleteWebMessages(host);
                var record = await Discipline.create({active: 1, IP: host, action: 'dayban', message: `The website user was banned for 24 hours by ${Meta['A'].dj}`}).fetch();
                sails.sockets.broadcast(host, 'webmessage', {status: 'denied', response: `Your interactions with WWSU have been placed under review. Please email engineer@wwsu1069.org for further assistance. Please include the following reference number(s) in your email: ${record.ID}`});
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    },

    /**
     * Bans a website or mobile app user indefinitely.
     * @constructor
     * @param {string} host - Unique ID of the user to ban.
     */
    permaban: function (host) {
        return new Promise(async (resolve, reject) => {
            try {
                Discipline.massDeleteWebMessages(host);
                var record = await Discipline.create({active: 1, IP: host, action: 'permaban', message: `The website user was banned indefinitely by ${Meta['A'].dj}`}).fetch();
                sails.sockets.broadcast(host, 'webmessage', {status: 'denied', response: `Your interactions with WWSU have been placed under review. Please email engineer@wwsu1069.org for further assistance. Please include the following reference number(s) in your email: ${record.ID}`});
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    },

    /**
     * Mass deletes all website messages sent by the specified user.
     * @constructor
     * @param {string} host - Unique ID of the user to ban.
     */
    massDeleteWebMessages: function (host) {
        return new Promise(async (resolve, reject) => {
            try {
                var records = await Messages.update({from: host}, {status: 'deleted'}).fetch();
                if (records.constructor == Array)
                {
                    records.forEach(function (record) {
                        sails.sockets.broadcast('message-delete', 'message-delete', {type: 'message', id: record.ID});
                    });
                } else {
                    sails.sockets.broadcast('message-delete', 'message-delete', {type: 'message', id: records.ID});
                }
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    }

};

