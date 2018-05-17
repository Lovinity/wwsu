/* global Messages */

module.exports = {

    friendlyName: 'messages / readEmergencies',

    description: 'Retrieve currently active reported emergencies / technical issues.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        var records = await Messages.find({to: 'emergency', status: 'active'})
                .intercept((err) => {
                    return exits.error(err);
                });
        if (typeof records === 'undefined' || records.length === 0)
        {
            return exits.success([]);
        } else {
            return exits.success(records);
        }
    }


};

