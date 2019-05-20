/* global Status */

module.exports = {


    friendlyName: 'Count IDs',


    description: '',


    inputs: {

    },



    fn: async function (inputs, exits) {

        try {
            var records3 = await Logs.find({ attendanceID: attendanceIDs3, logtype: "id" });
            records3
            .filter((record) => record.attendanceID !== null)
            .map((record) => {
                (async (record2) => {
                    var attendanceRecord = await Attendance.findOne({ID: record2.attendanceID});
                    if (attendanceRecord)
                    {
                        await Attendance.update({ID: record2.attendanceID}, {missedIDs: attendanceRecord.missedIDs + 1}).fetch();
                    }
                })(record);
            });

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};