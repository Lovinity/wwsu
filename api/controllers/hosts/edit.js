var sh = require("shorthash");
const cryptoRandomString = require("crypto-random-string");

module.exports = {
  friendlyName: "hosts / edit",

  description: "Edit a host.",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description: "The ID of the host to edit.",
    },

    friendlyname: {
      type: "string",
      description:
        "If provided, the friendly name of the host will be changed to this.",
    },

    authorized: {
      type: "boolean",
      description:
        "If provided, the authorized setting for the host will be changed to this (false = the host cannot receive tokens for restricted endpoints). If changing to false, and no other authorized admin exists, an error will be thrown to prevent accidental lockout.",
    },

    admin: {
      type: "boolean",
      description:
        "If provided, the admin setting for the host will be changed to this. If changing to false, and no other authorized admin exists, an error will be thrown to prevent accidental lockout.",
    },

    lockToDJ: {
      type: "number",
      description:
        "If provided, the lockToDJ setting for the host will be changed to this.",
      allowNull: true,
    },

    makeCalls: {
      type: "boolean",
      description:
        "If provided, the makeCalls setting for the host will be changed to this.",
    },

    answerCalls: {
      type: "boolean",
      description:
        "If provided, the answerCalls setting for the host will be changed to this.",
    },

    silenceDetection: {
      type: "boolean",
      description:
        "If provided, the silenceDetection setting for the host will be changed to this. If changing to true, and another host already has this set at true, an error will be thrown to prevent silence detection conflicts.",
    },

    recordAudio: {
      type: "boolean",
      description:
        "If provided, the recordAudio setting for the host will be changed to this. If changing to true, and another host already has this set at true, an error will be thrown to prevent silence detection conflicts.",
    },

    delaySystem: {
      type: "boolean",
      description:
        "If provided, the delaySystem setting for the host will be changed to this. If changing to true, and another host already has this set at true, an error will be thrown to prevent delay system conflicts.",
    },

    EAS: {
      type: "boolean",
      description:
        "If provided, the EAS setting for the host will be changed to this. If changing to true, and another host already has this set at true, an error will be thrown to prevent EAS conflicts.",
    },

    requests: {
      type: "boolean",
      description:
        "If provided, whether or not this host should receive track request notifications will be changed to this.",
    },

    emergencies: {
      type: "boolean",
      description:
        "If provided, whether or not this host should receive emergency / status notifications will be changed to this.",
    },

    accountability: {
      type: "boolean",
      description:
        "If provided, whether or not this host should receive notifications regarding director and show absences/changes/cancellations and failed Top-of-the-hour ID breaks.",
    },

    webmessages: {
      type: "boolean",
      description:
        "If provided, whether or not this host should receive web/client message notifications will be changed to this.",
    },
  },

  exits: {
    conflict: {
      statusCode: 409,
    },
  },

  fn: async function (inputs, exits) {
    sails.log.debug("Controller hosts/edit called.");

    try {
      // First, determine if we need to lock out of editing authorized and admin
      var lockout = await sails.models.hosts.count({
        authorized: true,
        admin: true,
      });

      // Block requests to change admin or authorized to false if there are 1 or less authorized admin hosts.
      if (
        lockout <= 1 &&
        ((typeof inputs.admin !== "undefined" && !inputs.admin) ||
          (typeof inputs.authorized !== "undefined" && !inputs.authorized))
      ) {
        return exits.conflict(
          "To prevent accidental lockout, this request was denied because there are 1 or less authorized admin hosts. Make another host an authorized admin first before removing authorized admin status from this host."
        );
      }

      // Now, if changing silenceDetection or recordAudio to true, ensure there aren't other hosts with it already true. If so, error to prevent conflict.
      if (
        typeof inputs.silenceDetection !== "undefined" &&
        inputs.silenceDetection !== null &&
        inputs.silenceDetection
      ) {
        lockout = await sails.models.hosts.count({
          ID: { "!=": inputs.ID },
          silenceDetection: true,
        });
        if (lockout >= 1) {
          return exits.conflict(
            "To prevent silence detection conflicts, this request was denied because another host already has silenceDetection. Please set the other host silenceDetection to false first."
          );
        }
      }
      if (
        typeof inputs.recordAudio !== "undefined" &&
        inputs.recordAudio !== null &&
        inputs.recordAudio
      ) {
        lockout = await sails.models.hosts.count({
          ID: { "!=": inputs.ID },
          recordAudio: true,
        });
        if (lockout >= 1) {
          return exits.conflict(
            "To prevent audio recording conflicts, this request was denied because another host already has recordAudio. Please set the other host recordAudio to false first."
          );
        }
      }
      if (
        typeof inputs.delaySystem !== "undefined" &&
        inputs.delaySystem !== null &&
        inputs.delaySystem
      ) {
        lockout = await sails.models.hosts.count({
          ID: { "!=": inputs.ID },
          delaySystem: true,
        });
        if (lockout >= 1) {
          return exits.conflict(
            "To prevent delay system conflicts, this request was denied because another host already has delaySystem. Please set the other host delaySystem to false first."
          );
        }
      }
      if (
        typeof inputs.EAS !== "undefined" &&
        inputs.EAS !== null &&
        inputs.EAS
      ) {
        lockout = await sails.models.hosts.count({
          ID: { "!=": inputs.ID },
          EAS: true,
        });
        if (lockout >= 1) {
          return exits.conflict(
            "To prevent EAS conflicts, this request was denied because another host already has EAS. Please set the other host EAS to false first."
          );
        }
      }

      // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
      var criteriaB = _.cloneDeep(inputs);

      // Edit it. Also update answerCalls and makeCalls in recipients if necessary.
      var hostRecord = await sails.models.hosts.updateOne(
        { ID: inputs.ID },
        criteriaB
      );
      if (typeof inputs.answerCalls !== "undefined") {
        await sails.models.recipients
          .update(
            {
              host: `computer-${sh.unique(
                hostRecord.host + sails.config.custom.hostSecret
              )}`,
            },
            { answerCalls: inputs.answerCalls && hostRecord.authorized }
          )
          .fetch();
      }
      if (typeof inputs.makeCalls !== "undefined") {
        await sails.models.recipients
          .update(
            {
              host: `computer-${sh.unique(
                hostRecord.host + sails.config.custom.hostSecret
              )}`,
            },
            { makeCalls: inputs.makeCalls && hostRecord.authorized }
          )
          .fetch();
      }

      // Edit the status of this host if necessary
      var statusRecord = await sails.models.status.findOne({
        name: `host-${sh.unique(
          hostRecord.host + sails.config.custom.hostSecret
        )}`,
      });

      // As a security measure, invalidate all tokens for hosts by changing the secret.
      sails.config.custom.secrets.hosts = cryptoRandomString({ length: 256 });

      var additionalData = ``;

      if (statusRecord) {
        if (
          hostRecord.silenceDetection ||
          hostRecord.recordAudio ||
          hostRecord.answerCalls
        ) {
          if (statusRecord.status !== 5) {
            var status = 4;
            if (hostRecord.silenceDetection || hostRecord.recordAudio) {
              status = 2;
              if (hostRecord.silenceDetection) {
                additionalData += ` This host is responsible for reporting silence when detected. Until the host is brought back online, you will not be alerted of on-air silence.`;
              }
              if (hostRecord.recordAudio) {
                additionalData += ` This host is responsible for recording on-air programming. Until the host is brought back online, on-air programming will not be recorded.`;
              }
            } else if (hostRecord.answerCalls) {
              status = 3;
            }
            await sails.helpers.status.change.with({
              name: `host-${sh.unique(
                hostRecord.host + sails.config.custom.hostSecret
              )}`,
              label: `Host ${hostRecord.friendlyname}`,
              status: status,
              data: `Host / DJ Controls is offline. Please ensure the application is running and connected to the internet.${additionalData}`,
            });
          } else {
            await sails.helpers.status.change.with({
              name: `host-${sh.unique(
                hostRecord.host + sails.config.custom.hostSecret
              )}`,
              label: `Host ${hostRecord.friendlyname}`,
              status: 5,
              data: `Host / DJ Controls is online.`,
            });
          }
        } else {
          await sails.models.status
            .destroy({
              name: `host-${sh.unique(
                hostRecord.host + sails.config.custom.hostSecret
              )}`,
            })
            .fetch();
        }
      }

      // All done.
      return exits.success();
    } catch (e) {
      return sails.error(e);
    }
  },
};
