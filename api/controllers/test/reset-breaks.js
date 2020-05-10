module.exports = {

    friendlyName: 'reset breaks',

    description: 'reset breaks test.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        var records = await sails.models.attendance.find();
        var breakLogs = await sails.models.logs.find({ logtype: 'break' });
        sails.log.debug(`reset-breaks: Got ${records.length} attendance records`);
        var maps = records.map(async (record) => {
            var breaks = breakLogs.filter((bl) => bl.attendanceID === record.ID).length;
            sails.log.debug(`reset-breaks: Attendance ID ${record.ID} had ${breaks} breaks.`);
            if (breaks > 0) {
                await sails.models.attendance.update({ ID: record.ID }, { breaks: breaks });
                sails.log.debug(`reset-breaks: Attendance ID ${record.ID} updated.`);
            }
        });
        await Promise.all(maps);

        sails.log.debug(`reset-breaks finished.`);

        return exits.success();
    }

}