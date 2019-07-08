module.exports = {


    friendlyName: 'Count IDs',


    description: '',


    inputs: {

    },



    fn: async function (inputs, exits) {

        try {
            var records3 = await Logs.find({ logtype: 'id' });
            var records4 = {};
            records3
                .filter((record) => record.attendanceID !== null)
                .map((record) => {
                    if (typeof records4[record.attendanceID] === `undefined`)
                        {records4[record.attendanceID] = 0;}
                    records4[record.attendanceID] += 1;
                });

            for (var record in records4) {
                if (records4.hasOwnProperty(record)) {
                    await Attendance.update({ ID: record }, { missedIDs: records4[record] }).fetch();
                }
            }

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
