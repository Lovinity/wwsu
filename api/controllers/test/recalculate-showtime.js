module.exports = {

    friendlyName: 'recalculate showtime',

    description: 'recalculate showtime test.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        var records = await sails.models.attendance.find();
        var maps = records.map(async (record) => {
            await sails.helpers.attendance.recalculate(record.ID);
            console.log(`showtime recalculate: Finished ${record.ID}`);
        })
        await Promise.all(maps);

        sails.log.debug(`showtime recalculate: DONE`);

        return exits.success();
    }

}