// TODO: FIX THIS WITH NEW CALENDAR SYSTEM

module.exports = {
  friendlyName: "Calendar / cancel-web",

  description: "Cancel an upcoming event from the DJ Panel.",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description:
        "ID of the calendar event if additionalException = false, or ID of the additional exception if additionalException = true."
    },
    start: {
      type: "string",
      required: true,
      custom: value => moment(value).isValid()
    },
    additionalException: {
      type: "boolean",
      defaultsTo: false
    },
    reason: {
      type: "string",
      required: true,
      maxLength: 512,
      minLength: 5,
      description: "Reason why this show is being canceled."
    }
  },

  fn: async function(inputs) {
    sails.log.debug("Controller calendar/cancel-web called.");

    // Generate a calendardb object
    var cEvent;
    var cRecord;
    var cException;
    if (!inputs.additionalException) {
      cRecord = await sails.models.calendar.findOne({ ID: inputs.ID });
      if (!cRecord)
        throw new Error("The provided ID was not found in calendar events.");
      cException = await sails.models.schedule.findOne({
        calendarID: inputs.ID,
        originalTime: inputs.start
      });
      cEvent = sails.models.calendar.calendardb.processRecord(
        cRecord,
        cException || {},
        inputs.start
      );
    } else {
      cException = await sails.models.schedule.findOne({
        type: "additional",
        ID: inputs.ID
      });
      if (!cException)
        throw new Error(
          "The provided ID was not found in calendar exceptions of type additional."
        );
      cRecord = await sails.models.calendar.findOne({
        ID: cExceptions.calendarID
      });
      if (!cRecord)
        throw new Error("The provided ID was not found in calendar events.");
      cEvent = sails.models.calendar.calendardb.processRecord(
        cRecord,
        cException,
        inputs.start
      );
    }

    // If the event exists, authorized DJ is the host, and was not already canceled manually (we should permit cancellations of canceled-system)
    if (
      cEvent &&
      cEvent.type !== "canceled" &&
      cEvent.hostDJ === this.req.payload.ID
    ) {
      // Make an attendance record if it does not already exist
      sails.models.attendance
        .findOrCreate(
          { unique: cEvent.unique },
          {
            calendarID: cEvent.calendarID,
            unique: cEvent.unique,
            dj: cEvent.hostDJ,
            cohostDJ1: cEvent.cohostDJ1,
            cohostDJ2: cEvent.cohostDJ2,
            cohostDJ3: cEvent.cohostDJ3,
            event: `${cEvent.type}: ${cEvent.hosts} - ${cEvent.name}`,
            happened: -1,
            happenedReason: inputs.reason,
            scheduledStart: moment(cEvent.start).toISOString(true),
            scheduledEnd: moment(cEvent.end).toISOString(true)
          }
        )
        .exec(async (err, attendance, wasCreated) => {
          var temp;
          if (err) {
            sails.log.error(err);
            return null;
          }

          // Or update the attendance record if one already exists for this event
          if (!wasCreated) {
            attendance = await sails.models.attendance
              .update(
                { ID: attendance.ID, happened: 1 },
                {
                  happened: -1,
                  happenedReason: inputs.reason,
                  scheduledStart: moment(cEvent.start).toISOString(true),
                  scheduledEnd: moment(cEvent.end).toISOString(true)
                }
              )
              .fetch();
          }

          // Create a cancellation exception, or change an existing exception to canceled if it exists.
          sails.models.schedule
            .findOrCreate(
              {
                calendarID: inputs.ID,
                originalTime: cEvent.start,
                scheduleType: { nin: ["additional", "additional-unscheduled"] }
              },
              {
                calendarID: inputs.ID,
                scheduleType: "canceled",
                scheduleReason: inputs.reason,
                originalTime: cEvent.start
              }
            )
            .exec(async (err2, record2, wasCreated2) => {
              if (!err2 && !wasCreated2) {
                await sails.models.schedule
                  .update(
                    { ID: record2.ID },
                    {
                      scheduleType: "canceled",
                      scheduleReason: inputs.reason
                    }
                  )
                  .fetch();
              }

              if (err2) return null;

              var record3 = sails.models.calendar.calendardb.processRecord(
                cEvent,
                record2,
                inputs.start
              );

              // Make logs and push out notifications
              if (record3.type === "show") {
                await sails.models.logs
                  .create({
                    attendanceID: attendance.ID,
                    logtype: "cancellation",
                    loglevel: "info",
                    logsubtype: `${record3.hosts} - ${record3.name}`,
                    logIcon: `fas fa-calendar-minus`,
                    title: `Show was canceled via DJ Panel`,
                    event: `Show: ${record3.hosts} - ${
                      record3.name
                    }<br />Scheduled time: ${moment(record3.start).format(
                      "llll"
                    )} - ${moment(record3.end).format("llll")}<br />Reason: ${
                      inputs.reason
                    }`,
                    createdAt: moment().toISOString(true)
                  })
                  .fetch()
                  .tolerate(err => {
                    sails.log.error(err);
                  });
                await sails.helpers.onesignal.sendMass(
                  "accountability-shows",
                  "Cancelled Show",
                  `${record3.hosts} - ${record3.name}, scheduled for ${moment(
                    record3.start
                  ).format("llll")} - ${moment(record3.end).format(
                    "llll"
                  )}, was cancelled via the DJ Panel. Please see DJ Controls / logs for the provided reason.`
                );
              }
              if (record3.type === "remote") {
                await sails.models.logs
                  .create({
                    attendanceID: attendance.ID,
                    logtype: "cancellation",
                    loglevel: "info",
                    logsubtype: `${record3.hosts} - ${record3.name}`,
                    logIcon: `fas fa-calendar-minus`,
                    title: `Remote broadcast was canceled via DJ Panel`,
                    event: `Show: ${record3.hosts} - ${
                      record3.name
                    }<br />Scheduled time: ${moment(record3.start).format(
                      "llll"
                    )} - ${moment(record3.end).format("llll")}<br />Reason: ${
                      inputs.reason
                    }`,
                    createdAt: moment().toISOString(true)
                  })
                  .fetch()
                  .tolerate(err => {
                    sails.log.error(err);
                  });
                await sails.helpers.onesignal.sendMass(
                  "accountability-shows",
                  "Cancelled Remote",
                  `${record3.hosts} - ${record3.name}, scheduled for ${moment(
                    record3.start
                  ).format("llll")} - ${moment(record3.end).format(
                    "llll"
                  )}, was cancelled via the DJ Panel. Please see DJ Controls / logs for the provided reason.`
                );
              }
              if (record3.type === "prerecord") {
                await sails.models.logs
                  .create({
                    attendanceID: attendance.ID,
                    logtype: "cancellation",
                    loglevel: "info",
                    logsubtype: `${record3.hosts} - ${record3.name}`,
                    logIcon: `fas fa-calendar-minus`,
                    title: `Prerecord was canceled via DJ Panel`,
                    event: `Prerecord: ${record3.hosts} - ${
                      record3.name
                    }<br />Scheduled time: ${moment(record3.start).format(
                      "llll"
                    )} - ${moment(record3.end).format("llll")}<br />Reason: ${
                      inputs.reason
                    }`,
                    createdAt: moment().toISOString(true)
                  })
                  .fetch()
                  .tolerate(err => {
                    sails.log.error(err);
                  });
                await sails.helpers.onesignal.sendMass(
                  "accountability-shows",
                  "Cancelled Prerecord",
                  `${record3.hosts} - ${record3.name}, scheduled for ${moment(
                    record3.start
                  ).format("llll")} - ${moment(record3.end).format(
                    "llll"
                  )}, was cancelled via the DJ Panel. Please see DJ Controls / logs for the provided reason.`
                );
              }
            });
        });
    } else {
      throw new Error(
        "The provided event was not found, or the authorized DJ is not the host of that event."
      );
    }
  }
};
