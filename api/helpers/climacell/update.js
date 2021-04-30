const got = require("got");

module.exports = {
  friendlyName: "Update",

  description: "Update climacell weather data.",

  inputs: {},

  exits: {},

  fn: async function (inputs) {
    if (
      !sails.config.custom.climacell.api ||
      sails.config.custom.climacell.api === ""
    )
      return;

    // Retrieve current records
    let records = await sails.models.climacell.find();

    // Get data from climacell
    let { body } = await got("https://api.tomorrow.io/v4/timelines", {
      method: "GET",
      searchParams: {
        location: `${sails.config.custom.climacell.position.latitude},${sails.config.custom.climacell.position.longitude}`,
        fields: [
          "temperature",
          "temperatureApparent",
          "dewPoint",
          "humidity",
          "windSpeed",
          "windDirection",
          "windGust",
          "precipitationIntensity",
          "precipitationProbability",
          "precipitationType",
          "visibility",
          "cloudCover",
          "weatherCode",
          "epaHealthConcern",
        ].join(),
        timesteps: ["current", "5m", "1h"].join(),
        units: "imperial",
      },
      responseType: "json",
      headers: {
        "Content-Type": "application/json",
        apikey: sails.config.custom.climacell.api,
      },
    });

    // Exit if there was an error, there was no body, or the body timelines constructor is not an array
    if (
      !body ||
      body.errorCode ||
      !body.data ||
      !body.data.timelines ||
      body.data.timelines.constructor !== Array
    ) {
      sails.log.error(new Error(body));
      return;
    }

    // Run through operations in the body for each timestep in the array
    let maps = body.data.timelines.map(async (timeline) => {

      // Skip if there are no intervals
      if (!timeline.intervals || timeline.intervals.constructor !== Array)
        return;

      // Run through each interval in the timeline
      let iMaps = timeline.intervals.map(async (interval, index) => {

        // No values? Exit.
        if (!interval.values) return;

        for (let field in interval.values) {
          if (!Object.prototype.hasOwnProperty.call(interval.values, field))
            continue;

          let dataClass = `${timeline.timestep}-${index}-${field}`;

          let original = records.find(
            (record) => record.dataClass === dataClass
          );

          // Update only if the value changed or the record does not exist
          if (
            !original ||
            original.data !== interval.values[field] ||
            !moment(interval.startTime).isSame(original.dataTime, "minute")
          ) {
            await new Promise(async (resolve) => {
              // Create the record if it does not exist
              sails.models.climacell
                .findOrCreate(
                  { dataClass: dataClass },
                  {
                    dataClass: dataClass,
                    data: interval.values[field],
                    dataTime: moment(interval.startTime).toISOString(true),
                  }
                )
                .exec(async (err, record, wasCreated) => {
                  // Exit on error or if the record was new / created
                  if (err) {
                    sails.log.error(err);
                    resolve();
                    return;
                  }
                  if (wasCreated) {
                    resolve();
                    return;
                  }

                  // At this point, record was not created; update it
                  await sails.models.climacell
                    .update(
                      { dataClass: dataClass },
                      {
                        dataClass: dataClass,
                        data: interval.values[field],
                        dataTime: moment(interval.startTime).toISOString(true),
                      }
                    )
                    .fetch();

                  resolve();
                });
            });
          }
        }
      });

      await Promise.all(iMaps);
    });

    await Promise.all(maps);

    return maps;
  },
};
