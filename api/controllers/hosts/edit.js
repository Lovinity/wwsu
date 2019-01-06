/* global Hosts, sails, Status, _ */
var sh = require("shorthash");

module.exports = {

    friendlyName: 'hosts / edit',

    description: 'Edit a host.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID of the host to edit.'
        },

        friendlyname: {
            type: 'string',
            description: 'If provided, the friendly name of the host will be changed to this.'
        },

        authorized: {
            type: 'boolean',
            description: 'If provided, the authorized setting for the host will be changed to this (false = the host cannot receive tokens for restricted endpoints). If changing to false, and no other authorized admin exists, an error will be thrown to prevent accidental lockout.'
        },

        admin: {
            type: 'boolean',
            description: 'If provided, the admin setting for the host will be changed to this. If changing to false, and no other authorized admin exists, an error will be thrown to prevent accidental lockout.'
        },

        makeCalls: {
            type: 'boolean',
            description: 'If provided, the makeCalls setting for the host will be changed to this.'
        },

        answerCalls: {
            type: 'boolean',
            description: 'If provided, the answerCalls setting for the host will be changed to this.'
        },

        silenceDetection: {
            type: 'boolean',
            description: 'If provided, the silenceDetection setting for the host will be changed to this. If changing to true, and another host already has this set at true, an error will be thrown to prevent silence detection conflicts.'
        },

        recordAudio: {
            type: 'boolean',
            description: 'If provided, the recordAudio setting for the host will be changed to this. If changing to true, and another host already has this set at true, an error will be thrown to prevent silence detection conflicts.'
        },

        requests: {
            type: 'boolean',
            description: 'If provided, whether or not this host should receive track request notifications will be changed to this.'
        },

        emergencies: {
            type: 'boolean',
            description: 'If provided, whether or not this host should receive emergency / status notifications will be changed to this.'
        },

        webmessages: {
            type: 'boolean',
            description: 'If provided, whether or not this host should receive web/client message notifications will be changed to this.'
        }
    },

    exits: {
        conflict: {
            statusCode: 409
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller hosts/edit called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
        try {
            // First, determine if we need to lock out of editing authorized and admin
            var lockout = await Hosts.count({authorized: true, admin: true});

            // Block requests to change admin or authorized to false if there are 1 or less authorized admin hosts.
            if (lockout <= 1 && ((typeof inputs.admin !== 'undefined' && !inputs.admin) || (typeof inputs.authorized !== 'undefined' && !inputs.authorized)))
                return exits.conflict("To prevent accidental lockout, this request was denied because there are 1 or less authorized admin hosts. Make another host an authorized admin first before removing authorized admin status from this host.");

            // Now, if changing silenceDetection or recordAudio to true, ensure there aren't other hosts with it already true. If so, error to prevent conflict
            if (typeof inputs.silenceDetection !== 'undefined' && inputs.silenceDetection !== null && inputs.silenceDetection)
            {
                var lockout = await Hosts.count({ID: {'!=': inputs.ID}, silenceDetection: true});
                if (lockout >= 1)
                    return exits.conflict("To prevent silence detection conflicts, this request was denied because another host already has silenceDetection. Please set the other host silenceDetection to false first.");
            }
            if (typeof inputs.recordAudio !== 'undefined' && inputs.recordAudio !== null && inputs.recordAudio)
            {
                var lockout = await Hosts.count({ID: {'!=': inputs.ID}, recordAudio: true});
                if (lockout >= 1)
                    return exits.conflict("To prevent audio recording conflicts, this request was denied because another host already has recordAudio. Please set the other host recordAudio to false first.");
            }

            // Determine what needs updating
            var criteria = {};
            if (typeof inputs.friendlyname !== 'undefined' && inputs.friendlyname !== null)
                criteria.friendlyname = inputs.friendlyname;
            if (typeof inputs.authorized !== 'undefined' && inputs.authorized !== null)
                criteria.authorized = inputs.authorized;
            if (typeof inputs.admin !== 'undefined' && inputs.admin !== null)
                criteria.admin = inputs.admin;
            if (typeof inputs.makeCalls !== 'undefined' && inputs.makeCalls !== null)
                criteria.makeCalls = inputs.makeCalls;
            if (typeof inputs.answerCalls !== 'undefined' && inputs.answerCalls !== null)
                criteria.answerCalls = inputs.answerCalls;
            if (typeof inputs.silenceDetection !== 'undefined' && inputs.silenceDetection !== null)
                criteria.silenceDetection = inputs.silenceDetection;
            if (typeof inputs.recordAudio !== 'undefined' && inputs.recordAudio !== null)
                criteria.recordAudio = inputs.recordAudio;
            if (typeof inputs.requests !== 'undefined' && inputs.requests !== null)
                criteria.requests = inputs.requests;
            if (typeof inputs.emergencies !== 'undefined' && inputs.emergencies !== null)
                criteria.emergencies = inputs.emergencies;
            if (typeof inputs.webmessages !== 'undefined' && inputs.webmessages !== null)
                criteria.webmessages = inputs.webmessages;

            // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
            var criteriaB = _.cloneDeep(criteria);

            // Edit it
            var hostRecord = await Hosts.updateOne({ID: inputs.ID}, criteriaB);

            // Edit the status of this host if necessary
            var statusRecord = await Status.findOne({name: `host-${sh.unique(hostRecord.host + sails.config.custom.hostSecret)}`});

            if (statusRecord)
            {
                if (hostRecord.silenceDetection || hostRecord.recordAudio || hostRecord.answerCalls)
                {
                    if (statusRecord.status !== 5)
                    {
                        var status = 4;
                        if (hostRecord.silenceDetection || hostRecord.recordAudio)
                        {
                            status = 2;
                        } else if (hostRecord.answerCalls) {
                            status = 3;
                        }
                        await Status.changeStatus([{name: `host-${sh.unique(hostRecord.host + sails.config.custom.hostSecret)}`, label: `Host ${hostRecord.friendlyname}`, status: status, data: `Host is offline.`}]);
                    } else {
                        await Status.changeStatus([{name: `host-${sh.unique(hostRecord.host + sails.config.custom.hostSecret)}`, label: `Host ${hostRecord.friendlyname}`, status: 5, data: `Host is online.`}]);
                    }
                } else {
                    await Status.destroy({name: `host-${sh.unique(hostRecord.host + sails.config.custom.hostSecret)}`}).fetch();
                }
            }

            // All done.
            return exits.success();

        } catch (e) {
            return sails.error(e);
        }

    }


};
