var goingDown = false;
var isSame = false;

module.exports = {
  friendlyName: "delay / status",

  description:
    "The host responsible for the delay system should hit this endpoint every 15 seconds, as well as immediately after calling delay/dump, to specify current delay system status and info.",

  inputs: {
    seconds: {
      type: "number",
      description:
        "Specify how many seconds of delay the delay system is reporting."
    },
    bypass: {
      type: "boolean",
      description:
        "Specify true if the bypass function on the delay system is activated."
    }
  },

  exits: {},

  fn: async function(inputs, exits) {
    sails.log.debug("Controller delay/status called.");

    try {
      isSame =
        sails.models.meta.memory.delaySystem ===
        (inputs.bypass ? null : inputs.seconds);

      // Check if the dump or stop button was potentially pressed. If it was, log it.
      if (
        !inputs.bypass &&
        sails.models.meta.memory.delaySystem !== null &&
        inputs.seconds < sails.models.meta.memory.delaySystem
      ) {
        if (!goingDown) {
          await sails.models.logs
            .create({
              attendanceID: sails.models.meta.memory.attendanceID,
              logtype: "delay-dump",
              loglevel: "warning",
              logsubtype: ``,
              logIcon: `fas fa-eject`,
              title: `Delay system dump or stop button pressed.`,
              event: `The delay system's dump or stop button might have been pressed. You may wish to review the broadcast recordings to ensure no inappropriate content went on the air.<br />${sails.models.meta.memory.line1}<br />${sails.models.meta.memory.line2}`,
              createdAt: moment().toISOString(true)
            })
            .fetch()
            .tolerate(err => {
              sails.log.error(err);
            });
        }
        goingDown = true;
      } else {
        goingDown = false;
      }

      if (inputs.bypass) {
        await sails.helpers.status.change.with({
          name: "delay-system",
          label: "Delay System",
          data: `Delay system is in bypass mode and not actively delaying! This is against FCC regulations. Please disable bypass by pressing the bypass button on the delay system. You can also click the dump button in DJ Controls Administration -> Maintenance to bring the delay out of bypass.`,
          status: 2
        });
        if (sails.models.meta.memory.delaySystem !== null) {
          await sails.models.logs
            .create({
              attendanceID: sails.models.meta.memory.attendanceID,
              logtype: "delay-bypass",
              loglevel: "orange",
              logsubtype: ``,
              logIcon: `fas fa-eject`,
              title: `Delay system entered bypass mode.`,
              event: `The delay system entered bypass mode, probably because someone pressed the bypass button.`,
              createdAt: moment().toISOString(true)
            })
            .fetch()
            .tolerate(err => {
              sails.log.error(err);
            });
        }
        await sails.helpers.meta.change.with({ delaySystem: null });
      } else if (inputs.seconds <= 0) {
        if (sails.models.meta.memory.delaySystem <= 0) {
          if (sails.models.meta.memory.delaySystem !== null) {
            await sails.helpers.status.change.with({
              name: "delay-system",
              label: "Delay System",
              data: `Delay system is returning 0 seconds of delay. This is against FCC regulations (requirement is 7 seconds or more). Please ensure the delay system is activated. You may have to press the start button. You can also click the dump button in DJ Controls Administration -> Maintenance.`,
              status: 2
            });
          }
        } else {
          await sails.helpers.status.change.with({
            name: "delay-system",
            label: "Delay System",
            data: `Delay system is returning 0 seconds of delay. This is against FCC regulations (requirement is 7 seconds or more). The cough / dump button might have been pressed recently; if so, wait a moment to see if the delay starts re-building.`,
            status: 4
          });
        }
        await sails.helpers.meta.change.with({ delaySystem: 0 });
      } else if (inputs.seconds < 7) {
        if (isSame) {
          await sails.helpers.status.change.with({
            name: "delay-system",
            label: "Delay System",
            data: `Delay system is returning ${inputs.seconds} seconds of delay. This is against FCC regulations (requirement is 7 seconds or more). Please ensure the delay system is set at a delay of at least 7 seconds.`,
            status: 2
          });
        } else {
          await sails.helpers.status.change.with({
            name: "delay-system",
            label: "Delay System",
            data: `Delay system is returning ${inputs.seconds} seconds of delay. This is against FCC regulations (requirement is 7 seconds or more). But the delay system may be adjusting its delay at this time.`,
            status: 4
          });
        }
        await sails.helpers.meta.change.with({ delaySystem: inputs.seconds });
      } else {
        await sails.helpers.status.change.with({
          name: "delay-system",
          label: "Delay System",
          data: `Delay System is reporting ${inputs.seconds} seconds of delay. This is within FCC limits (7 seconds or more).`,
          status: 5
        });
        await sails.helpers.meta.change.with({ delaySystem: inputs.seconds });
      }

      return exits.success();
    } catch (e) {
      return exits.error(e);
    }
  }
};
