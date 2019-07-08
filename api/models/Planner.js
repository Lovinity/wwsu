module.exports = {
    datastore: 'nodebase',
    attributes: {
        ID: {
            type: 'number',
            autoIncrement: true
        },

        dj: {
            type: 'string',
            required: true,
        },

        show: {
            type: 'string',
            required: true,
        },

        priority: {
            type: 'number',
            allowNull: true
        },

        proposal: {
            type: 'json',
        },

        actual: {
            type: 'json',
        }

    },

    // Websockets standards
    afterCreate: function (newlyCreatedRecord, proceed) {
        delete newlyCreatedRecord.login;
        var data = {insert: newlyCreatedRecord};
        sails.log.silly(`planner socket: ${data}`);
        sails.sockets.broadcast('planner', 'planner', data);
        return proceed();
    },

    afterUpdate: function (updatedRecord, proceed) {
        delete updatedRecord.login;
        var data = {update: updatedRecord};
        sails.log.silly(`planner socket: ${data}`);
        sails.sockets.broadcast('planner', 'planner', data);
        return proceed();
    },

    afterDestroy: function (destroyedRecord, proceed) {
        var data = {remove: destroyedRecord.ID};
        sails.log.silly(`planner socket: ${data}`);
        sails.sockets.broadcast('planner', 'planner', data);
        return proceed();
    }

};


