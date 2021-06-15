module.exports = {
  friendlyName: "silence / active",

  description:
    "DJ Controls should call this endpoint every minute whenever silence is detected.",

  inputs: {},

  fn: async function(inputs, exits) {
    sails.log.debug("Controller silence/active called.");

    try {
      // Log it
      await sails.models.logs
        .create({
          attendanceID: sails.models.meta.memory.attendanceID,
          logtype: "silence",
          loglevel: "orange",
          logsubtype: sails.models.meta.memory.show,
          logIcon: `fas fa-volume-off`,
          title: `Silence detection alarm triggered.`,
          event: `Silence / very low audio was detected for several seconds. Please investigate the cause and ensure this does not happen again.`
        })
        .fetch()
        .tolerate(() => {});

      // If we are in automation, and prevSilence is less than 3 minutes ago, assume an audio issue and switch RadioDJs
      if (
        sails.models.status.errorCheck.prevSilence &&
        moment().isBefore(
          moment(sails.models.status.errorCheck.prevSilence).add(3, "minutes")
        ) &&
        sails.models.meta.memory.state.startsWith("automation_")
      ) {
        await sails.helpers.meta.change.with({
          changingState: `Multiple silence alarms; switching automation instances`
        });

        // Log the problem
        await sails.models.logs
          .create({
            attendanceID: sails.models.meta.memory.attendanceID,
            logtype: "silence-switch",
            loglevel: "danger",
            logsubtype: "",
            logIcon: `fas fa-volume-mute`,
            title: `System changed active RadioDJ due to multiple silence alarms within 3 minutes.`,
            event: `Please check to make sure all RadioDJs are functioning correctly and audio is not muted or very quiet from all RadioDJ sources.`
          })
          .fetch()
          .tolerate(err => {
            sails.log.error(err);
          });
        await sails.helpers.onesignal.sendMass(
          "emergencies",
          "Silence Detection Triggered Multiple Times",
          `System had switched automation instances on ${moment().format(
            "LLLL"
          )} because the silence detection system triggered multiple times. Please check DJ Controls.`
        );

        await sails.helpers.status.change.with({
          name: `silence`,
          status: 1,
          label: `Silence`,
          data: `Silence / very low audio detected multiple times! Switched RadioDJ instances.
          <ul>
            <li>Silence detection was also triggered less than 3 minutes ago. Check to ensure all RadioDJs are working and audio is being sent out correctly. System switched RadioDJs as a precaution.</li>
            <li>If audio is going over the air, check the Audio Settings on the DJ Controls responsible for silence detection.</li>
          </ul>`
        });

        // Find a RadioDJ to switch to
        var maps = sails.config.custom.radiodjs
          .filter(
            instance => instance.rest === sails.models.meta.memory.radiodj
          )
          .map(async instance => {
            var status = await sails.models.status.findOne({
              name: `radiodj-${instance.name}`
            });
            if (status && status.status !== 1) {
              await sails.helpers.status.change.with({
                name: `radiodj-${instance.name}`,
                label: `RadioDJ ${instance.label}`,
                status: 2,
                data: `Silence detection triggered multiple times. This RadioDJ might not be outputting audio.`
              });
            }
            return true;
          });
        await Promise.all(maps);

        sails.sockets.broadcast("system-error", "system-error", true);

        // Only wait 1 second for these commands in case radioDJ is frozen; we don't want too much additional silence.
        await sails.helpers.rest.cmd("EnableAutoDJ", 0, 1000);
        await sails.helpers.rest.cmd("EnableAssisted", 1, 1000);
        await sails.helpers.rest.cmd("StopPlayer", 0, 1000);

        // Switch RadioDJs and re-queue the queue
        var queue = sails.models.meta.automation;
        await sails.helpers.rest.changeRadioDj();
        await sails.helpers.rest.cmd("ClearPlaylist", 1);
        await sails.helpers.error.post(queue);
        await sails.helpers.meta.change.with({ changingState: null });
      }

      // else If a track is playing in RadioDJ, skip it and log it (provided we are not in a prerecord)
      else if (
        typeof sails.models.meta.automation[0] !== "undefined" &&
        parseInt(sails.models.meta.automation[0].ID) !== 0 &&
        sails.models.meta.memory.state !== "prerecord_on"
      ) {
        // Add a log about the track
        await sails.models.logs
          .create({
            attendanceID: sails.models.meta.memory.attendanceID,
            logtype: "silence-track",
            loglevel: "warning",
            logsubtype: sails.models.meta.memory.show,
            logIcon: `fas fa-forward`,
            title: `Track was skipped due to silence detection.`,
            event: `Track: ${sails.models.meta.automation[0].ID} (${sails.models.meta.automation[0].Artist} - ${sails.models.meta.automation[0].Title})<br />Please check this track to ensure it does not have more consecutive silence / very low audio than what silence detection is set at.`
          })
          .fetch()
          .tolerate(() => {});

        // Skip the track if there's a track playing in automation and there's another track queued
        if (typeof sails.models.meta.automation[1] !== "undefined") {
          await sails.helpers.rest.cmd("PlayPlaylistTrack", 0);
        }

        // Activate status issue
        await sails.helpers.status.change.with({
          name: `silence`,
          status: 2,
          label: `Silence`,
          data: `Silence / very low audio detected! Track skipped due to potential silence.
          <ul>
            <li>Check track ${sails.models.meta.automation[0].ID} (${sails.models.meta.automation[0].Artist} - ${sails.models.meta.automation[0].Title}) in RadioDJ by looking at its waveform; ensure it does not have excessive silence / low audio.</li>
            <li>If audio is going over the air, check the Audio Settings on the DJ Controls responsible for silence detection.</li>
          </ul>`
        });
      }

      // else If we are not in automation, and prevSilence is less than 2 minutes ago, assume irresponsible DJ and automatically end the show (but go into automation_break).
      else if (
        sails.models.status.errorCheck.prevSilence &&
        moment().isBefore(
          moment(sails.models.status.errorCheck.prevSilence).add(2, "minutes")
        ) &&
        !sails.models.meta.memory.state.startsWith("automation_")
      ) {
        await sails.helpers.meta.change.with({
          changingState: `Ending current broadcast due to no audio`
        });

        // Log the problem
        await sails.models.logs
          .create({
            attendanceID: sails.models.meta.memory.attendanceID,
            logtype: "silence-terminated",
            loglevel: "danger",
            logsubtype: sails.models.meta.memory.show,
            logIcon: `fas fa-microphone-slash`,
            title: `Broadcast terminated: Silence detection triggered twice within 2 minutes.`,
            event: `This is likely the responsibility of the DJ / host. System terminated the broadcast and went to automation to stop the silence. Please investigate and, if necessary, speak with the host(s) about ensuring proper volume levels and avoiding on-air silence.<br />Broadcast: ${sails.models.meta.memory.show}`
          })
          .fetch()
          .tolerate(err => {
            sails.log.error(err);
          });
        await sails.helpers.onesignal.sendMass(
          "emergencies",
          "Multiple Silences During Broadcast",
          `${
            sails.models.meta.memory.show
          } was terminated automatically on ${moment().format(
            "LLLL"
          )} because of a long period of silence or multiple silences in a short time. Please talk with the DJ about avoiding silence on the air.`
        );

        await sails.helpers.status.change.with({
          name: `silence`,
          status: 1,
          label: `Silence`,
          data: `Silence / very low audio detected! Broadcast was terminated.
          <ul>
            <li>Silence detection was triggered more than once in the last 2 minutes. The broadcast was terminated as a result.</li>
            <li>If audio is going over the air, check the Audio Settings on the DJ Controls responsible for silence detection.</li>
          </ul>`
        });

        await sails.helpers.state.automation(true);

        // Otherwise, do not do anything except update status.
      } else {
        await sails.helpers.status.change.with({
          name: `silence`,
          status: 2,
          label: `Silence`,
          data: `Silence / very low audio detected! Please ensure audio is going out over the air and audio levels are not too low.`
        });
      }

      sails.models.status.errorCheck.prevSilence = moment();
      return exits.success();
    } catch (e) {
      return exits.error(e);
    }
  }
};
