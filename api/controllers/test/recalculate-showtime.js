module.exports = {

    friendlyName: 'recalculate showtime',

    description: 'recalculate showtime test.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        console.log(`showtime recalculate: started`);
        var records = await sails.models.attendance.find();
        console.log(`showtime recalculate: Got ${records.length} attendance records.`);

        var logs = await sails.models.logs.find({ excused: false, logtype: [ 'cancellation', 'silence', 'absent', 'unauthorized', 'id', 'sign-on-early', 'sign-on-late', 'sign-off-early', 'sign-off-late', 'break' ] });
        console.log(`showtime recalculate: Got ${logs.length} log records.`)

        var listeners = await sails.models.listeners.find().sort('createdAt ASC');
        console.log(`showtime recalculate: Got ${listeners.length} listener records.`)

        var messages = await sails.models.messages.find({ status: 'active', or: [ { to: { startsWith: 'website-' } }, { to: 'DJ' }, { to: 'DJ-private' } ] });
        console.log(`showtime recalculate: Got ${messages.length} message records.`)

        while (records.length > 0) {
            var record = records.shift();

            var toUpdate = {
                showTime: null,
                tuneIns: null,
                listenerMinutes: null,
                webMessages: null,
                missedIDs: [],
                breaks: 0,
                cancellation: false,
                absent: false,
                unauthorized: false,
                silence: [],
                signedOnEarly: false,
                signedOnLate: false,
                signedOffEarly: false,
                signedOffLate: false
            }

            // Get accountability logs
            logs
                .filter((log) => log.attendanceID === record.ID)
                .map((log) => {
                    switch (log.logtype) {
                        case 'cancellation':
                            toUpdate.cancellation = true;
                            break;
                        case 'silence':
                            toUpdate.silence.push(log.createdAt);
                            break;
                        case 'absent':
                            toUpdate.absent = true;
                            break;
                        case 'unauthorized':
                            toUpdate.unauthorized = true;
                            break;
                        case 'id':
                            toUpdate.missedIDs.push(log.createdAt);
                            break;
                        case 'sign-on-early':
                            toUpdate.signedOnEarly = true;
                            break;
                        case 'sign-on-late':
                            toUpdate.signedOnLate = true;
                            break;
                        case 'sign-off-early':
                            toUpdate.signedOffEarly = true;
                            break;
                        case 'sign-off-late':
                            toUpdate.signedOffLate = true;
                            break;
                        case 'break':
                            toUpdate.breaks++;
                            break;
                    }
                });

            // Calculate show stats if it has ended
            if (record.actualEnd !== null) {
                // Pre-calculations
                toUpdate.showTime = moment(record.actualEnd).diff(moment(record.actualStart), 'minutes');
                toUpdate.listenerMinutes = 0;

                // Calculate listener minutes

                // Fetch listenerRecords since beginning of sails.models.attendance, as well as the listener count prior to start of attendance record.
                var listenerRecords = listeners.filter((listener) => moment(listener.createdAt).isAfter(moment(record.actualStart)) && moment(listener.createdAt).isSameOrBefore(moment(record.actualEnd)))
                var prevListeners = listenerRecords.reverse().find((listener) => moment(listener.createdAt).isSameOrBefore(moment(record.actualStart)))
                if (prevListeners) { prevListeners = prevListeners.listeners || 0 }

                // Calculate listener minutes and listener tune-ins
                var prevTime = moment(record.actualStart)
                var listenerMinutes = 0
                var tuneIns = 0

                if (listenerRecords && listenerRecords.length > 0) {
                    listenerRecords.map(listener => {
                        listenerMinutes += (moment(listener.createdAt).diff(moment(prevTime), 'seconds') / 60) * prevListeners
                        if (listener.listeners > prevListeners) { tuneIns += (listener.listeners - prevListeners) }
                        prevListeners = listener.listeners
                        prevTime = moment(listener.createdAt)
                    })
                }

                // This is to ensure listener minutes from the most recent entry up until the current time is also accounted for
                listenerMinutes += (moment(record.actualEnd).diff(moment(prevTime), 'seconds') / 60) * prevListeners

                toUpdate.listenerMinutes = Math.round(listenerMinutes)
                toUpdate.tuneIns = tuneIns

                // Calculate web messages
                toUpdate.webMessages = messages.filter((message) => moment(message.createdAt).isSameOrAfter(moment(record.actualStart)) && moment(message.createdAt).isSameOrBefore(moment(record.actualEnd)))
            }

            await sails.models.attendance.updateOne({ ID: record.ID }, toUpdate);

            console.log(`showtime recalculate: Finished record ${record.ID}`)
        }

        sails.log.debug(`showtime recalculate: DONE`);

        return exits.success();
    }

}