module.exports = {
  friendlyName: "eas.addAlert",

  description: "Prepares an alert to be pushed by the eas/postParse helper.",

  inputs: {
    reference: {
      type: "string",
      required: true,
      description: "A unique ID for the alert provided by the source.",
    },
    source: {
      type: "string",
      required: true,
      description:
        "This alert originates from the provided source. Use NWS for NWS sources so that this helper can retrieve alert information.",
    },
    county: {
      type: "string",
      required: true,
      description: "This alert applies to the specified county.",
    },
    alert: {
      type: "string",
      required: true,
      description: 'The alert name/event. Eg. "Severe Thunderstorm Warning".',
    },
    severity: {
      type: "string",
      required: true,
      isIn: ["Extreme", "Severe", "Moderate", "Minor"],
      description: `Severity of alert: One of the following in order from highest to lowest ['Extreme', 'Severe', 'Moderate', 'Minor']`,
    },
    starts: {
      type: "string",
      custom: function (value) {
        return moment(value).isValid();
      },
      allowNull: true,
      description: `moment() parsable string of when the alert starts. Recommended ISO string.`,
    },
    expires: {
      type: "string",
      custom: function (value) {
        return moment(value).isValid();
      },
      allowNull: true,
      description: `moment() parsable string of when the alert expires. Recommended ISO string.`,
    },
    color: {
      type: "string",
      regex: /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i,
      description: "Hex color representing this alert.",
      required: true,
    },
    information: {
      type: "string",
      allowNull: true,
      description: "Detailed information about this alert for the public.",
    },
  },

  fn: async function (inputs, exits) {
    sails.log.debug(
      `Helper eas.addAlert called for ${inputs.county}/${inputs.alert}.`
    );
    try {
      var criteria = {};

      // Define a function for processing information into the sails.models.eas.pendingAlerts variable.
      // Notably, this function ensures the same alert from different counties are joined together.
      var processPending = (criteria) => {
        if (
          typeof sails.models.eas.pendingAlerts[
            `${inputs.source}.${inputs.reference}`
          ] === `undefined`
        ) {
          sails.models.eas.pendingAlerts[
            `${inputs.source}.${inputs.reference}`
          ] = criteria;
        } else {
          for (var key in criteria) {
            if (Object.prototype.hasOwnProperty.call(criteria, key)) {
              if (key !== `counties`) {
                sails.models.eas.pendingAlerts[
                  `${inputs.source}.${inputs.reference}`
                ][key] = criteria[key];
              } else {
                var temp =
                  sails.models.eas.pendingAlerts[
                    `${inputs.source}.${inputs.reference}`
                  ][key].split(", ");
                if (temp.indexOf(inputs.county) === -1) {
                  temp.push(inputs.county);
                }
                temp = temp.join(", ");
                sails.models.eas.pendingAlerts[
                  `${inputs.source}.${inputs.reference}`
                ][key] = temp;
              }
            }
          }
        }
      };

      // Get the alert if it already exists in the database
      var record = await sails.models.eas
        .findOne({ source: inputs.source, reference: inputs.reference })
        .tolerate((err) => {
          sails.log.error(err);
        });
      // exists
      if (record) {
        sails.log.verbose(
          `Alert ${inputs.county}/${inputs.alert} already exists.`
        );
        // Detect if the county issuing the alert is already in the alert. If not, add the county in.
        var temp = record.counties.split(", ");
        if (temp.indexOf(inputs.county) === -1) {
          temp.push(inputs.county);
        }
        temp = temp.join(", ");

        // Prepare criteria to update
        criteria = {
          source: inputs.source,
          reference: inputs.reference,
          alert: inputs.alert,
          severity: inputs.severity,
          color: inputs.color,
          counties: temp,
          starts:
            inputs.starts !== null
              ? moment(inputs.starts).toISOString(true)
              : moment().toISOString(true),
          expires:
            inputs.expires !== null
              ? moment(inputs.expires).toISOString(true)
              : moment().add(1, "hours").toISOString(true),
        };
        if (
          typeof inputs.information !== "undefined" &&
          inputs.information !== null
        ) {
          criteria.information = inputs.information;
        }

        sails.log.verbose(`Criteria`, criteria);

        // Detect any changes in the alert. If a change is detected, we will do a database update.
        var updateIt = false;
        for (var key in criteria) {
          if (Object.prototype.hasOwnProperty.call(criteria, key)) {
            if (criteria[key] !== record[key]) {
              updateIt = true;
            }
          }
        }
        sails.log.silly(
          `${inputs.county}/${inputs.alert} Needs updating?: ${updateIt}`
        );
        if (updateIt) {
          criteria._new = false;
          criteria._update = true;
          processPending(criteria);
        } else {
          criteria._update = false;
        }
        return exits.success();
      } else {
        // Does not exist; new alert
        sails.log.verbose(`Alert ${inputs.county}/${inputs.alert} is new.`);

        // Prepare criteria
        criteria = {
          source: inputs.source,
          reference: inputs.reference,
          alert: inputs.alert,
          severity: inputs.severity,
          color: inputs.color,
          counties: inputs.county,
          starts:
            inputs.starts !== null
              ? moment(inputs.starts).toISOString(true)
              : moment().toISOString(true),
          expires:
            inputs.expires !== null
              ? moment(inputs.expires).toISOString(true)
              : moment().add(1, "hours").toISOString(true),
          information: inputs.information || "",
        };

        sails.log.verbose(`Initial criteria`, criteria);

        // If this alert came from NWS, we need to GET a separate URL for alert information before we create the record.
        if (
          inputs.source === "NWS" &&
          (typeof sails.models.eas.pendingAlerts[
            `${inputs.source}.${inputs.reference}`
          ] === `undefined` ||
            sails.models.eas.pendingAlerts[
              `${inputs.source}.${inputs.reference}`
            ].information === "" ||
            sails.models.eas.pendingAlerts[
              `${inputs.source}.${inputs.reference}`
            ].information === null)
        ) {
          sails.log.verbose(
            "Alert is from NWS source. Retrieving alert information."
          );
          var resp = await needle("get", inputs.reference);

          // Go through each child
          var maps = resp.body.children
            .filter(
              (entry) =>
                typeof entry.name !== "undefined" && entry.name === "info"
            )
            .map(async (entry) => {
              var details = {
                description: "",
                instruction: "",
              };

              // Parse field information into the alert variable
              entry.children.map((entry2) => {
                switch (entry2.name) {
                  case "description":
                    details.description = entry2.value;
                    break;
                  case "instruction":
                    details.instruction = entry2.value;
                    break;
                }
              });

              // Sometimes, EAS will return "This alert has expired". If so, leave information blank.
              if (
                !details.description
                  .toLowerCase()
                  .includes("this alert has expired")
              ) {
                criteria.information = `${
                  details.description === ""
                    ? `No information is available for this alert.`
                    : details.description
                }.${
                  details.instruction !== ""
                    ? `Precautionary / preparedness actions: ${details.instruction}.`
                    : ``
                }`;
                sails.log.verbose(
                  `Alert ${inputs.county}/${inputs.alert} is still valid.`
                );
              } else {
                sails.log.verbose(
                  `Alert ${inputs.county}/${inputs.alert} has expired, according to NWS`
                );
              }
              sails.log.silly(`Criteria: ${criteria}`);
              criteria._new = true;
              criteria._update = false;
              processPending(criteria);
              return true;
            });
          await Promise.all(maps);

          return exits.success();
        } else {
          sails.log.verbose(`Criteria: ${criteria}`);
          criteria._new = true;
          criteria._update = false;
          processPending(criteria);
          return exits.success();
        }
      }
    } catch (e) {
      return exits.error(e);
    }
  },
};
