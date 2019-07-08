module.exports = {

    friendlyName: 'config / xp / set',

    description: 'Set configuration regarding the XP system for DJs.',

    inputs: {
        listenerMinutes: {
            type: 'number',
            min: 0.01,
            description: `For live and remove shows, DJs earn 1 XP for every specified listener minute during their show. Decimals are permitted. Minimum allowed value is 0.01.`
        },
        prerecordListenerMinutes: {
            type: 'number',
            min: 0.01,
            description: `For prerecorded shows, DJs earn 1 XP for every specified listener minute during the airing of the prerecord. Decimals are permitted. Minimum allowed value is 0.01.`
        },
        showMinutes: {
            type: 'number',
            min: 0.01,
            description: `For live shows and remotes, Earn 1 XP for every specified minutes a DJ was on the air. Can be a decimal. Minimum allowed value is 0.01.`
        },
        prerecordShowMinutes: {
            type: 'number',
            min: 0.01,
            description: `For prerecorded shows, Earn 1 XP for every specified minutes a prerecord was on the air. Can be a decimal. Minimum allowed value is 0.01.`
        },
        ID: {
            type: 'number',
            description: `For live shows and remotes, earn the specified number in XP for every on-time top of the hour break taken.`
        },
        prerecordBreak: {
            type: 'number',
            description: `For prerecords, earn the specified number in XP for every time the prerecord was divided into a separate track, thereby allowing the system to air a break.`
        },
        topAdd: {
            type: 'number',
            description: `For live shows and remotes, earn the specified number in XP for every time the DJ played a Top Add.`
        },
        web: {
            type: 'number',
            description: `For live shows and remotes, earn the specified number in XP every time the DJ sent a message out to a website/mobile visitor (or publicly to all visitors).`
        },
        remoteCredit: {
            type: 'number',
            description: `A DJ should have the specified number of XP added to their profile for every remote credit they earned.`
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller config/xp/set called.');

        try {
            // Set the new configuration of any and all values provided as input
            for (var key in inputs)
            {
                if (inputs.hasOwnProperty(key))
                {
                    sails.config.custom.XP[key] = inputs[key];
                }
            }

            // broadcast changes over websockets
            sails.sockets.broadcast('config', 'config', {update: {XP: sails.config.custom.XP}});

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};


