module.exports = {

    friendlyName: 'Calendar / cancel-web',

    description: 'Cancel an upcoming show from the DJ Panel.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID of the calendar event to cancel.'
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

            var cEvent = await sails.models.calendar.updateOne({ ID: inputs.ID, unique: {'!=': null}, or: [ { title: { 'startsWith': `Show: ${this.req.payload.name} - ` } }, { title: { 'startsWith': `Remote: ${this.req.payload.name} - ` } }, { title: { 'startsWith': `Prerecord: ${this.req.payload.name} - ` } } ] }, { active: -1 }).fetch()

            if (cEvent) {
                var dj = cEvent.title
              if (dj.includes(' - ') && dj.includes(': ')) {
                dj = dj.split(' - ')[ 0 ]
                dj = dj.substring(dj.indexOf(': ') + 2)
              } else {
                dj = null
              }
              if (dj !== null) { dj = await sails.models.djs.findOrCreate({ name: dj }, { name: dj, lastSeen: moment('2002-01-01').toISOString(true) }) }
              sails.models.attendance.findOrCreate({ unique: cEvent.unique }, { unique: cEvent.unique, dj: dj !== null && typeof dj.ID !== 'undefined' ? dj.ID : null, event: cEvent.title, happened: -1, happenedReason: inputs.reason, scheduledStart: moment(cEvent.start).toISOString(true), scheduledEnd: moment(cEvent.end).toISOString(true) })
                .exec(async (err, attendance, wasCreated) => {
                  var temp
                  if (err) {
                    sails.log.error(err)
                    return null
                  }

                  if (!wasCreated) {
                    attendance = await sails.models.attendance.update({ ID: attendance.ID, happened: 1 }, { unique: cEvent.unique, dj: dj !== null && typeof dj.ID !== 'undefined' ? dj.ID : null, event: cEvent.title, happened: -1, happenedReason: inputs.reason, scheduledStart: moment(cEvent.start).toISOString(true), scheduledEnd: moment(cEvent.end).toISOString(true) })
                  }

                  if (cEvent.title.startsWith('Show: ')) {
                    temp = cEvent.title.replace('Show: ', '')
                    await sails.helpers.onesignal.sendEvent(`Show: `, temp, `Live Show`, cEvent.unique, moment(cEvent.start).format('LLL'), true)
                    await sails.models.logs.create({ attendanceID: attendance.ID, logtype: 'cancellation', loglevel: 'info', logsubtype: temp, event: `<strong>Show was canceled via DJ Panel!</strong><br />Show: ${temp}<br />Scheduled time: ${moment(cEvent.start).format('LLL')} - ${moment(cEvent.end).format('LT')}<br />Reason: ${inputs.reason}`, createdAt: moment().toISOString(true) }).fetch()
                      .tolerate((err) => {
                        sails.log.error(err)
                      })
                    await sails.helpers.onesignal.sendMass('accountability-shows', 'Cancelled Show', `${temp}, scheduled for ${moment(cEvent.start).format('LLL')} - ${moment(cEvent.end).format('LT')}, was cancelled via the DJ Panel. Please see DJ Controls / logs for the provided reason.`)
                  }
                  if (cEvent.title.startsWith('Remote: ')) {
                    temp = cEvent.title.replace('Remote: ', '')
                    await sails.helpers.onesignal.sendEvent(`Remote: `, temp, `Remote Broadcast`, cEvent.unique, moment(cEvent.start).format('LLL'), true)
                    await sails.models.logs.create({ attendanceID: attendance.ID, logtype: 'cancellation', loglevel: 'info', logsubtype: temp, event: `<strong>Remote broadcast was canceled via DJ Panel!</strong><br />Remote: ${temp}<br />Scheduled time: ${moment(cEvent.start).format('LLL')} - ${moment(cEvent.end).format('LT')}<br />Reason: ${inputs.reason}`, createdAt: moment().toISOString(true) }).fetch()
                      .tolerate((err) => {
                        sails.log.error(err)
                      })
                    await sails.helpers.onesignal.sendMass('accountability-shows', 'Cancelled Remote', `${temp}, scheduled for ${moment(cEvent.start).format('LLL')} - ${moment(cEvent.end).format('LT')}, was cancelled via DJ Panel. Please see DJ Controls / logs for the provided reason.`)
                  }
                  if (cEvent.title.startsWith('Prerecord: ')) {
                    temp = cEvent.title.replace('Prerecord: ', '')
                    await sails.helpers.onesignal.sendEvent(`Prerecord: `, temp, `Prerecorded Show`, cEvent.unique, moment(cEvent.start).format('LLL'), true)
                    await sails.models.logs.create({ attendanceID: attendance.ID, logtype: 'cancellation', loglevel: 'info', logsubtype: temp, event: `<strong>Prerecorded show was canceled via DJ Panel!</strong><br />Prerecord: ${temp}<br />Scheduled time: ${moment(cEvent.start).format('LLL')} - ${moment(cEvent.end).format('LT')}<br />Reason: ${inputs.reason}`, createdAt: moment().toISOString(true) }).fetch()
                      .tolerate((err) => {
                        sails.log.error(err)
                      })
                    await sails.helpers.onesignal.sendMass('accountability-shows', 'Cancelled Prerecord', `${temp}, scheduled for ${moment(cEvent.start).format('LLL')} - ${moment(cEvent.end).format('LT')}, was cancelled via DJ Panel. Please see DJ Controls / logs for the provided reason.`)
                  }
                })
            } else {
                return exits.error(new Error('No events with the provided ID and authorized DJ were found.'))
            }
        } catch (e) {
            return exits.error(e)
        }
    }

}
