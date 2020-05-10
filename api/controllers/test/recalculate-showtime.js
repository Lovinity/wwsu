module.exports = {

    friendlyName: 'recalculate showtime',

    description: 'recalculate showtime test.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        console.log(`showtime recalculate: started`);
        var records = await sails.models.attendance.find();
        console.log(`showtime recalculate: Got ${records.length} attendance records.`);

        while (records.length > 0) {
            var record = records.shift();
            await sails.helpers.attendance.recalculate(record.ID);
            console.log(`showtime recalculate: Finished ${record.ID}`);
        }

        sails.log.debug(`showtime recalculate: DONE`);

        return exits.success();
    }

}