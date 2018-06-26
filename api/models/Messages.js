/* global sails */

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
        }

    },

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        // Do not pass IP addresses through web sockets!
        if (typeof newlyCreatedRecord.from_IP !== 'undefined')
            delete newlyCreatedRecord.from_IP;
        var data = {insert: newlyCreatedRecord};
        sails.log.silly(`messages socket: ${data}`);
        sails.sockets.broadcast('messages', 'messages', data);

        // If message was a public website message, send to public website socket
        if (newlyCreatedRecord.to === 'DJ' || newlyCreatedRecord.to === 'website')
        {
            sails.log.silly(`messages socket for messages-website: ${data}`);
            sails.sockets.broadcast('messages-website', 'messages', data);
        }

        // If message was a private website message, send to the respective client's socket
        if (newlyCreatedRecord.from.startsWith("website-") && newlyCreatedRecord.to === 'DJ-private')
        {
            sails.log.silly(`messages socket for messages-${newlyCreatedRecord.from}: ${data}`);
            sails.sockets.broadcast(`messages-${newlyCreatedRecord.from}`, 'messages', data);
        }
        if (newlyCreatedRecord.to.startsWith("website-") || newlyCreatedRecord.to.startsWith("display-"))
        {
            sails.log.silly(`messages socket for messages-${newlyCreatedRecord.to}: ${data}`);
            sails.sockets.broadcast(`messages-${newlyCreatedRecord.to}`, 'messages', data);
        }

        return proceed();
    },

    afterUpdate: function (updatedRecord, proceed) {
        // Do not pass IP addresses through web sockets!
        if (typeof updatedRecord.from_IP !== 'undefined')
            delete updatedRecord.from_IP;
        var data = {update: updatedRecord};
        sails.log.silly(`messages socket: ${data}`);
        sails.sockets.broadcast('messages', 'messages', data);

        // If message was a public website message, send to public website socket
        if (updatedRecord.to === 'DJ' || updatedRecord.to === 'website')
        {
            sails.log.silly(`messages socket for messages-website: ${data}`);
            sails.sockets.broadcast('messages-website', 'messages', data);
        }

        // If message was a private website message, send to the respective client's socket
        if (updatedRecord.from.startsWith("website-") && updatedRecord.to === 'DJ-private')
        {
            sails.log.silly(`messages socket for messages-${updatedRecord.from}: ${data}`);
            sails.sockets.broadcast(`messages-${updatedRecord.from}`, 'messages', data);
        }
        if (updatedRecord.to.startsWith("website-") || updatedRecord.to.startsWith("display-"))
        {
            sails.log.silly(`messages socket for messages-${updatedRecord.to}: ${data}`);
            sails.sockets.broadcast(`messages-${updatedRecord.to}`, 'messages', data);
        }

        return proceed();
    },

    afterDestroy: function (destroyedRecord, proceed) {
        // Do not pass IP addresses through web sockets!
        if (typeof destroyedRecord.from_IP !== 'undefined')
            delete destroyedRecord.from_IP;
        var data = {insert: destroyedRecord};
        sails.log.silly(`messages socket: ${data}`);
        sails.sockets.broadcast('messages', 'messages', data);

        // If message was a public website message, send to public website socket
        if (destroyedRecord.to === 'DJ' || destroyedRecord.to === 'website')
        {
            sails.log.silly(`messages socket for messages-website: ${data}`);
            sails.sockets.broadcast('messages-website', 'messages', data);
        }

        // If message was a private website message, send to the respective client's socket
        if (destroyedRecord.from.startsWith("website-") && destroyedRecord.to === 'DJ-private')
        {
            sails.log.silly(`messages socket for messages-${destroyedRecord.from}: ${data}`);
            sails.sockets.broadcast(`messages-${destroyedRecord.from}`, 'messages', data);
        }
        if (destroyedRecord.to.startsWith("website-") || destroyedRecord.to.startsWith("display-"))
        {
            sails.log.silly(`messages socket for messages-${destroyedRecord.to}: ${data}`);
            sails.sockets.broadcast(`messages-${destroyedRecord.to}`, 'messages', data);
        }

        return proceed();
    }

};

