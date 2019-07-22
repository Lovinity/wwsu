module.exports = {

  friendlyName: `silence / active`,

  description: `DJ Controls should call this endpoint every minute whenever silence is detected.`,

  inputs: {
  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Controller silence/active called.`)

    try {
      // Activate status issue
      sails.models.status.changeStatus([{ name: `silence`, status: 2, label: `Silence`, data: `Silence / very low audio detected.` }])

      // If a track is playing in RadioDJ, skip it and log it
      if (typeof sails.models.meta.automation[0] !== `undefined` && parseInt(sails.models.meta.automation[0].ID) !== 0) {
        // Add a log about the track
        await sails.models.logs.create({ attendanceID: sails.models.meta[`A`].attendanceID, logtype: `silence-track`, loglevel: `warning`, logsubtype: sails.models.meta[`A`].show, event: `<strong>Track skipped due to silence.</strong><br />Track: ${sails.models.meta.automation[0].ID} (${sails.models.meta.automation[0].Artist} - ${sails.models.meta.automation[0].Title})` }).fetch()
          .tolerate(() => {
          })

        // Skip the track if there's a track playing in automation and there's another track queued
        if (typeof sails.models.meta.automation[1] !== `undefined`) {
          await sails.helpers.rest.cmd(`PlayPlaylistTrack`, 0)
        }
      }

      // If we are in automation, and prevError is less than 3 minutes ago, assume an audio issue and switch RadioDJs
      if (moment().isBefore(moment(sails.models.status.errorCheck.prevError).add(3, `minutes`)) && (sails.models.meta[`A`].state.startsWith(`automation_`) || sails.models.meta[`A`].state === `live_prerecord`)) {
        await sails.models.meta.changeMeta({ changingState: `Switching automation instances due to no audio` })

        // Log the problem
        await sails.models.logs.create({ attendanceID: sails.models.meta[`A`].attendanceID, logtype: `system`, loglevel: `danger`, logsubtype: ``, event: `<strong>Switching automation instances;</strong> silence detection executed multiple times.` }).fetch()
          .tolerate((err) => {
            sails.log.error(err)
          })
        await sails.models.announcements.findOrCreate({ type: `djcontrols`, title: `Audio Error (system)`, announcement: `System recently had switched automation instances because the silence detection system triggered multiple times. Please check the logs for more info.` }, { type: `djcontrols`, level: `urgent`, title: `Audio Error (system)`, announcement: `System recently had switched automation instances because the silence detection system triggered multiple times. Please check the logs for more info.`, starts: moment().toISOString(true), expires: moment({ year: 3000 }).toISOString(true) })
          .tolerate((err) => {
            sails.log.error(err)
          })

        // Find a RadioDJ to switch to
        var maps = sails.config.custom.radiodjs
          .filter((instance) => instance.rest === sails.models.meta[`A`].radiodj)
          .map(async (instance) => {
            var status = await sails.models.status.findOne({ name: `radiodj-${instance.name}` })
            if (status && status.status !== 1) { await sails.models.status.changeStatus([{ name: `radiodj-${instance.name}`, label: `RadioDJ ${instance.label}`, status: 2, data: `Silence detection triggered multiple times. This RadioDJ might not be outputting audio.` }]) }
            return true
          })
        await Promise.all(maps)

        sails.sockets.broadcast(`system-error`, `system-error`, true)

        // Prepare the radioDJ
        await sails.helpers.rest.cmd(`EnableAutoDJ`, 0, 0)
        await sails.helpers.rest.cmd(`EnableAssisted`, 1, 0)
        await sails.helpers.rest.cmd(`StopPlayer`, 0, 0)
        var queue = sails.models.meta.automation
        await sails.helpers.rest.changeRadioDj()
        await sails.helpers.rest.cmd(`ClearPlaylist`, 1)
        await sails.helpers.error.post(queue)
        await sails.models.meta.changeMeta({ changingState: null })
      }

      sails.models.status.errorCheck.prevError = moment()
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
