module.exports = {

    friendlyName: 'Calendar / cancel-web',

    description: 'Cancel an upcoming event from the DJ Panel.',

    inputs: {
        // TODO: Change this use in the DJ web panel
        ID: {
            type: 'number',
            required: true,
            description: 'ID of the calendar event if additionalException = false, or ID of the additional exception if additionalException = true.'
        },
        start: {
            type: 'string',
            required: true,
            custom: (value) => moment(value).isValid()
        },
        additionalException: {
            type: 'boolean',
            defaultsTo: false
        },
        reason: {
            type: 'string',
            required: true,
            maxLength: 512,
            minLength: 5,
            description: 'Reason why this show is being canceled.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller calendar/cancel-web called.')
        try {

            // Generate a calendardb object
            var cEvent;
            var cRecord;
            var cException;
            if (!inputs.additionalException) {
                cRecord = await sails.models.calendar7.findOne({ ID: inputs.ID });
                if (!cRecord) return exits.error('The provided ID was not found in calendar events.');
                cException = await sails.models.calendarexceptions.findOne({ calendarID: inputs.ID, exceptionTime: inputs.start });
                cEvent = sails.models.calendar7.calendardb.processRecord(cRecord, cException || {}, inputs.start);
            } else {
                cException = await sails.models.calendarexceptions.findOne({ type: 'additional', ID: inputs.ID });
                if (!cException) return exits.error('The provided ID was not found in calendar exceptions of type additional.');
                cRecord = await sails.models.calendar7.findOne({ ID: cExceptions.calendarID });
                if (!cRecord) return exits.error('The provided ID was not found in calendar events.');
                cEvent = sails.models.calendar7.calendardb.processRecord(cRecord, cException, inputs.start);
            }

            // If the event exists, authorized DJ is the host, and was not already canceled manually (we should permit cancellations of canceled-system)
            if (cEvent && cEvent.type !== 'canceled' && cEvent.hostDJ === this.req.payload.ID) {

                // Make an attendance record if it does not already exist
                sails.models.attendance.findOrCreate({ unique: cEvent.unique }, { calendarID: cEvent.calendarID, unique: cEvent.unique, dj: cEvent.hostDJ, cohostDJ1: cEvent.cohostDJ1, cohostDJ2: cEvent.cohostDJ2, cohostDJ3: cEvent.cohostDJ3, event: `${cEvent.type}: ${cEvent.hosts} - ${cEvent.name}`, happened: -1, happenedReason: inputs.reason, scheduledStart: moment(cEvent.start).toISOString(true), scheduledEnd: moment(cEvent.end).toISOString(true) })
                    .exec(async (err, attendance, wasCreated) => {
                        var temp
                        if (err) {
                            sails.log.error(err)
                            return null
                        }

                        // Or update the attendance record if one already exists for this event
                        if (!wasCreated) {
                            attendance = await sails.models.attendance.update({ ID: attendance.ID, happened: 1 }, { happened: -1, happenedReason: inputs.reason, scheduledStart: moment(cEvent.start).toISOString(true), scheduledEnd: moment(cEvent.end).toISOString(true) }).fetch();
                        }

                        // Create a cancellation exception, or change an existing exception to canceled if it exists.
                        sails.models.calendarexceptions.findOrCreate({calendarID: inputs.ID, exceptionTime: cEvent.start, exceptionType: {'!=': 'additional'}}, {
                            calendarID: inputs.ID,
                            exceptionType: 'canceled',
                            exceptionReason: inputs.reason,
                            exceptionTime: cEvent.start
                        }).exec(async (err2, record2, wasCreated2) => {
                            if (!err2 && !wasCreated2) {
                                await sails.models.calendarexceptions.update({ID: record2.ID}, {
                                    exceptionType: 'canceled',
                                    exceptionReason: inputs.reason
                                }).fetch();
                            }
                        });

                        // Make logs and push out notifications
                        if (cEvent.type === 'show') {
                            await sails.helpers.onesignal.sendEvent(`Show: `, temp, `Live Show`, cEvent.unique, moment(cEvent.start).format('LLL'), true)
                            await sails.models.logs.create({ attendanceID: attendance.ID, logtype: 'cancellation', loglevel: 'info', logsubtype: `${cEvent.hosts} - ${cEvent.name}`, event: `<strong>Show was canceled via DJ Panel!</strong><br />Show: ${cEvent.hosts} - ${cEvent.name}<br />Scheduled time: ${moment(cEvent.start).format('llll')} - ${moment(cEvent.end).format('llll')}<br />Reason: ${inputs.reason}`, createdAt: moment().toISOString(true) }).fetch()
                                .tolerate((err) => {
                                    sails.log.error(err)
                                })
                            await sails.helpers.onesignal.sendMass('accountability-shows', 'Cancelled Show', `${cEvent.hosts} - ${cEvent.name}, scheduled for ${moment(cEvent.start).format('llll')} - ${moment(cEvent.end).format('llll')}, was cancelled via the DJ Panel. Please see DJ Controls / logs for the provided reason.`)
                        }
                        if (cEvent.type === 'remote') {
                            await sails.helpers.onesignal.sendEvent(`Remote: `, temp, `Remote Broadcast`, cEvent.unique, moment(cEvent.start).format('LLL'), true)
                            await sails.models.logs.create({ attendanceID: attendance.ID, logtype: 'cancellation', loglevel: 'info', logsubtype: `${cEvent.hosts} - ${cEvent.name}`, event: `<strong>Remote broadcast was canceled via DJ Panel!</strong><br />Show: ${cEvent.hosts} - ${cEvent.name}<br />Scheduled time: ${moment(cEvent.start).format('llll')} - ${moment(cEvent.end).format('llll')}<br />Reason: ${inputs.reason}`, createdAt: moment().toISOString(true) }).fetch()
                                .tolerate((err) => {
                                    sails.log.error(err)
                                })
                            await sails.helpers.onesignal.sendMass('accountability-shows', 'Cancelled Remote', `${cEvent.hosts} - ${cEvent.name}, scheduled for ${moment(cEvent.start).format('llll')} - ${moment(cEvent.end).format('llll')}, was cancelled via the DJ Panel. Please see DJ Controls / logs for the provided reason.`)
                        }
                        if (cEvent.type === 'prerecord') {
                            await sails.helpers.onesignal.sendEvent(`Prerecord: `, temp, `Prerecorded Show`, cEvent.unique, moment(cEvent.start).format('LLL'), true)
                            await sails.models.logs.create({ attendanceID: attendance.ID, logtype: 'cancellation', loglevel: 'info', logsubtype: `${cEvent.hosts} - ${cEvent.name}`, event: `<strong>Prerecord was canceled via DJ Panel!</strong><br />Prerecord: ${cEvent.hosts} - ${cEvent.name}<br />Scheduled time: ${moment(cEvent.start).format('llll')} - ${moment(cEvent.end).format('llll')}<br />Reason: ${inputs.reason}`, createdAt: moment().toISOString(true) }).fetch()
                                .tolerate((err) => {
                                    sails.log.error(err)
                                })
                            await sails.helpers.onesignal.sendMass('accountability-shows', 'Cancelled Prerecord', `${cEvent.hosts} - ${cEvent.name}, scheduled for ${moment(cEvent.start).format('llll')} - ${moment(cEvent.end).format('llll')}, was cancelled via the DJ Panel. Please see DJ Controls / logs for the provided reason.`)
                        }
                    })

                return exits.success()
            } else {
                return exits.error(new Error('The provided event was not found, or the authorized DJ is not the host of that event.'))
            }
        } catch (e) {
            return exits.error(e)
        }
    }

}