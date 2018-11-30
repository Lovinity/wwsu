/* global sails, Attendance */

module.exports = {

    friendlyName: 'Stats',

    description: 'Stats test.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        try {

            var records = await Attendance.find().sort("createdAt ASC");
            var listenerRecordsA = await Listeners.find().sort("createdAt ASC");
            var maps = records
                    .filter(record => record.actualStart !== null && record.actualEnd !== null)
                    .map(async currentRecord => {
                        console.log(`Updating Attendance ID ${currentRecord.ID}`);
                        // Fetch listenerRecords since beginning of Attendance, as well as the listener count prior to start of attendance record.
                        var listenerRecords = listenerRecordsA
                                .filter(record2 => moment(record2.createdAt).isSameOrAfter(moment(currentRecord.actualStart)) && moment(record2.createdAt).isSameOrBefore(moment(currentRecord.actualEnd)))
                        var prevListeners = await Listeners.find({'createdAt': {'<=': currentRecord.actualStart}}).sort('createdAt DESC').limit(1) || 0;
                        if (prevListeners[0])
                            prevListeners = prevListeners[0].listeners || 0;

                        // Calculate listener minutes
                        var prevTime = moment(currentRecord.actualStart);
                        var listenerMinutes = 0;

                        if (listenerRecords && listenerRecords.length > 0)
                        {
                            listenerRecords.map(listener => {
                                listenerMinutes += (moment(listener.createdAt).diff(moment(prevTime), 'seconds') / 60) * prevListeners;
                                prevListeners = listener.listeners;
                                prevTime = moment(listener.createdAt);
                            });

                            // This is to ensure listener minutes from the most recent entry up until the current time is also accounted for
                            listenerMinutes += (moment(currentRecord.actualEnd).diff(moment(prevTime), 'seconds') / 60) * prevListeners;

                            listenerMinutes = Math.round(listenerMinutes);

                            await Attendance.update({ID: currentRecord.ID}, {listenerMinutes: listenerMinutes}).fetch();
                        }

                        return true;
                    });
            await Promise.all(maps);

            await sails.helpers.attendance.calculateStats();

            return exits.success(Attendance.weeklyAnalytics);
        } catch (e) {
            return exits.error(e);
        }
    }


};
