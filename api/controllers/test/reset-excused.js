module.exports = {

    friendlyName: 'reset excused',

    description: 'reset excused test.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        var records = await sails.models.attendance.find({ ignore: 2 });
        var IDs = records.map((record) => record.ID);
        var maps = IDs.map(async (ID) => {
            await sails.models.logs.update({ attendanceID: ID }, { excused: true });
        });
        await Promise.all(maps);

        records = await sails.models.attendance.find({ ignore: 0 });
        IDs = records.map((record) => record.ID);
        maps = IDs.map(async (ID) => {
            await sails.models.logs.update({ attendanceID: ID }, { acknowledged: false });
        });
        await Promise.all(maps);

        return exits.success();
    }

}