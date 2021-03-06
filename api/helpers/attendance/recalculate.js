module.exports = {
  friendlyName: "attendance.recalculate",

  description: "Re-calculate information about the specified attendance record",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description: "ID of the attendance record to recalculate.",
    },
  },

  fn: async function (inputs, exits) {
    sails.log.debug("Helper attendance.recalculate called.");

    try {
      var record = await sails.models.attendance.findOne({ ID: inputs.ID });
      if (!record) return exits.success();

      var toUpdate = {
        showTime: null,
        tuneIns: null,
        listenerMinutes: null,
        listenerPeak: null,
        listenerPeakTime: null,
        webMessages: null,
        discordMessages: null,
        missedIDs: [],
        breaks: 0,
        cancellation: false,
        absent: false,
        unauthorized: false,
        silence: [],
        signedOnEarly: false,
        signedOnLate: false,
        signedOffEarly: false,
        signedOffLate: false,
        badPlaylist: false,
      };

      // Get logs
      var logs = await sails.models.logs.find({ attendanceID: inputs.ID });

      // Calculate accountability
      logs
        .filter((log) => !log.excused)
        .map((log) => {
          switch (log.logtype) {
            case "cancellation":
              toUpdate.cancellation = true;
              break;
            case "silence":
              toUpdate.silence.push(log.createdAt);
              break;
            case "absent":
              toUpdate.absent = true;
              break;
            case "unauthorized":
              toUpdate.unauthorized = true;
              break;
            case "id":
              toUpdate.missedIDs.push(log.createdAt);
              break;
            case "sign-on-early":
              toUpdate.signedOnEarly = true;
              break;
            case "sign-on-late":
              toUpdate.signedOnLate = true;
              break;
            case "sign-off-early":
              toUpdate.signedOffEarly = true;
              break;
            case "sign-off-late":
              toUpdate.signedOffLate = true;
              break;
            case "break":
              toUpdate.breaks++;
              break;
            case "bad-playlist":
              toUpdate.badPlaylist = true;
          }
        });

      // Calculate show stats if it has ended
      if (record.actualEnd !== null) {
        // Pre-calculations
        toUpdate.showTime = moment(record.actualEnd).diff(
          moment(record.actualStart),
          "minutes"
        );
        toUpdate.listenerMinutes = 0;

        // Calculate listener minutes

        var listeners = [];

        // Fetch listenerRecords since beginning of sails.models.attendance, as well as the listener count prior to start of attendance record.
        var listenerRecords = await sails.models.listeners
          .find({
            createdAt: {
              ">": moment(record.actualStart).toISOString(true),
              "<=": moment(record.actualEnd).toISOString(true),
            },
          })
          .sort("createdAt ASC");
        var prevListeners =
          (await sails.models.listeners
            .find({ createdAt: { "<=": record.actualStart } })
            .sort("createdAt DESC")
            .limit(1)) || 0;
        if (prevListeners[0]) {
          prevListeners = prevListeners[0].listeners || 0;
          listeners.push({
            time: record.actualStart,
            listeners: prevListeners,
          });
        }

        // Calculate listener minutes, listener peak, and listener tune-ins
        var prevTime = moment(record.actualStart);
        var listenerMinutes = 0;
        var listenerPeak = 0;
        var listenerPeakTime = null;
        var tuneIns = 0;

        if (listenerRecords && listenerRecords.length > 0) {
          listenerRecords.map((listener) => {
            listeners.push({
              time: listener.createdAt,
              listeners: listener.listeners,
            });
            listenerMinutes +=
              (moment(listener.createdAt).diff(moment(prevTime), "seconds") /
                60) *
              prevListeners;
            if (listener.listeners > prevListeners) {
              tuneIns += listener.listeners - prevListeners;
            }
            if (listener.listeners > listenerPeak) {
              listenerPeak = listener.listeners;
              listenerPeakTime = moment(listener.createdAt).toISOString(true);
            }
            prevListeners = listener.listeners;
            prevTime = moment(listener.createdAt);
          });
        }

        // This is to ensure listener minutes from the most recent entry up until the current time is also accounted for
        listenerMinutes +=
          (moment(record.actualEnd).diff(moment(prevTime), "seconds") / 60) *
          prevListeners;

        toUpdate.listenerMinutes = Math.round(listenerMinutes);
        toUpdate.listenerPeak = listenerPeak;
        toUpdate.listenerPeakTime = listenerPeakTime;
        toUpdate.tuneIns = tuneIns;

        // Calculate web and discord messages
        var messages = await sails.models.messages.find({
          status: "active",
          or: [
            { to: { startsWith: "website-" } },
            { to: { startsWith: "discord-" } },
            { to: "DJ" },
            { to: "DJ-private" },
          ],
          createdAt: {
            ">=": moment(record.actualStart).toISOString(true),
            "<=": moment(record.actualEnd).toISOString(true),
          },
        });
        toUpdate.webMessages = messages.length;
      }

      var toUpdate2 = _.cloneDeep(toUpdate);

      await sails.models.attendance.updateOne({ ID: inputs.ID }, toUpdate2);

      toUpdate.attendance = record;
      toUpdate.listeners = listeners;
      toUpdate.logs = logs;
      toUpdate.messages = messages;

      return exits.success(toUpdate);
    } catch (e) {
      return exits.error(e);
    }
  },
};
