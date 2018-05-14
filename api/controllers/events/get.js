module.exports = {

    friendlyName: 'Events / Get',

    description: 'Get the events from WWSU Google Calendar for the next 7 days.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        var records = await Events.find()
                .intercept((err) => {
                    sails.log.error(err);
                    exits.error();
                })
        return exits.success(records);
    }


};
