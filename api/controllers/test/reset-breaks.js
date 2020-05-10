module.exports = {

    friendlyName: 'reset breaks',

    description: 'reset breaks test.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        var records = await sails.models.attendance.find();
        var maps = records.map(async (record) => {
            var breaks = await sails.models.logs.count({ attendanceID: record.ID, logtype: 'break' });
            await sails.models.attendance.update({ ID: record.ID }, { breaks: breaks });
        });
        await Promise.all(maps);

        return exits.success();
    }

}