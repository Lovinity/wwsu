module.exports = {

    friendlyName: 'delay / status',

    description: 'The host responsible for the delay system should hit this endpoint every 15 seconds, as well as immediately after calling delay/dump, to specify current delay system status and info.',

    inputs: {
        seconds: {
            type: 'number',
            description: 'Specify how many seconds of delay the delay system is reporting.'
        },
        bypass: {
            type: 'boolean',
            description: 'Specify true if the bypass function on the delay system is activated.'
        }
    },

    exits: {
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller delay/status called.')

        try {
            sails.sockets.broadcast('delay-system-status', 'delay-system-status', { seconds: inputs.seconds, bypass: inputs.bypass })

            if (inputs.bypass) {
                await sails.helpers.status.change.with({ name: 'delay-system', label: 'Delay System', data: `Delay system is in bypass mode and not actively delaying! This is against FCC regulations. Please disable bypass by pressing the bypass button on the delay system.`, status: 1 })
            } else if (inputs.seconds <= 0) {
                await sails.helpers.status.change.with({ name: 'delay-system', label: 'Delay System', data: `Delay system is returning 0 seconds of delay. This is against FCC regulations (requirement is 7 seconds or more). Please ensure the delay system is activated. You may have to press the start button.`, status: 1 })
            } else if (inputs.seconds < 7) {
                await sails.helpers.status.change.with({ name: 'delay-system', label: 'Delay System', data: `Delay system is reporting ${inputs.seconds} seconds of delay. This is against FCC regulations (requirement is 7 seconds or more). Please ensure the delay system is working properly. The delay system might be slowly re-building the delay after use of dump or cough.`, status: 2 })
            } else {
                await sails.helpers.status.change.with({ name: 'delay-system', label: 'Delay System', data: `Delay System is reporting ${inputs.seconds} seconds of delay. This is within FCC limits (7 seconds or more).`, status: 5 })
            }

            return exits.success()
        } catch (e) {
            return exits.error(e)
        }
    }

}