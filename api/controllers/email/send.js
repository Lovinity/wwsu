module.exports = {
  friendlyName: "email/send",

  description: "Send an email to people in the system.",

  inputs: {
    sendTo: {
      type: "string",
      required: true,
      isIn: [
        "All DJs, Directors, and Assistants",
        "All Directors and Assistants",
        "All non-assistant Directors",
        "Admin Directors Only",
        "All DJs",
        "DJs Active This Semester",
        "DJs Active in the Past 30 Days",
        "DJs Active in the Past 7 Days"
      ]
    },
    bcc: {
      type: "boolean",
      defaultsTo: true
    },
    subject: {
      type: "string",
      required: true,
      maxLength: 64
    },
    body: {
      type: "string",
      required: true
    }
  },

  exits: {},

  fn: async function(inputs) {
    // Determine who to send to
    let recipients = [];
    let djs;
    let directors;
    switch (inputs.sendTo) {
      case "All DJs, Directors, and Assistants":
        djs = await sails.models.djs.find({ email: { "!=": null } });
        djs
          .filter(dj => dj.email && dj.email !== "")
          .map(dj => recipients.push(dj.email));
        directors = await sails.models.directors.find({
          email: { "!=": null }
        });
        directors
          .filter(director => director.email && director.email !== "")
          .map(director => recipients.push(director.email));
        break;
      case "All Directors and Assistants":
        directors = await sails.models.directors.find({
          email: { "!=": null }
        });
        directors
          .filter(director => director.email && director.email !== "")
          .map(director => recipients.push(director.email));
        break;
      case "All non-assistant Directors":
        directors = await sails.models.directors.find({
          email: { "!=": null },
          assistant: false
        });
        directors
          .filter(director => director.email && director.email !== "")
          .map(director => recipients.push(director.email));
        break;
      case "Admin Directors Only":
        directors = await sails.models.directors.find({
          email: { "!=": null },
          admin: true
        });
        directors
          .filter(director => director.email && director.email !== "")
          .map(director => recipients.push(director.email));
        break;
      case "All DJs":
        djs = await sails.models.djs.find({ email: { "!=": null } });
        djs
          .filter(dj => dj.email && dj.email !== "")
          .map(dj => recipients.push(dj.email));
        break;
      case "DJs Active This Semester":
        djs = await sails.models.djs.find({
          email: { "!=": null },
          lastSeen: {
            ">=": moment(sails.config.custom.startOfSemester).toISOString(true)
          }
        });
        djs
          .filter(dj => dj.email && dj.email !== "")
          .map(dj => recipients.push(dj.email));
        break;
      case "DJs Active in the Past 30 Days":
        djs = await sails.models.djs.find({
          email: { "!=": null },
          lastSeen: {
            ">=": moment()
              .subtract(30, "days")
              .toISOString(true)
          }
        });
        djs
          .filter(dj => dj.email && dj.email !== "")
          .map(dj => recipients.push(dj.email));
        break;
      case "DJs Active in the Past 7 Days":
        djs = await sails.models.djs.find({
          email: { "!=": null },
          lastSeen: {
            ">=": moment()
              .subtract(7, "days")
              .toISOString(true)
          }
        });
        djs
          .filter(dj => dj.email && dj.email !== "")
          .map(dj => recipients.push(dj.email));
        break;
    }

    let thisDirector = await sails.models.directors.findOne({
      ID: this.req.payload.ID
    });
    thisDirector =
      thisDirector && thisDirector.email && thisDirector.email !== ""
        ? thisDirector.email
        : "wwsu1069fm@wright.edu";

    return await sails.helpers.emails.queue.with({
      to: inputs.bcc ? thisDirector : recipients,
      bcc: inputs.bcc ? recipients : undefined,
      subject: inputs.subject,
      text: inputs.body,
      sendNow: false
    });
  }
};
