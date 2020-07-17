const got = require('got');

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

    // Start with real-time data
    let { body } = await got("https://api.climacell.co/v3/weather/realtime", {
      method: "GET",
      query: {
        lat: sails.config.custom.climacell.position.latitude,
        lon: sails.config.custom.climacell.position.longitude,
        unit_system: sails.config.custom.climacell.unitSystem,
        fields: [
          "temp",
          "feels_like",
          "humidity",
          "dewpoint",
          "wind_speed",
          "wind_direction",
          "wind_gust",
          "precipitation",
          "precipitation_type",
          "visibility",
          "cloud_cover",
          "weather_code",
          "epa_health_concern",
          "road_risk_score",
        ],
      },
      responseType: "json",
      headers: {
        "Content-Type": "application/json",
        apikey: sails.config.custom.climacell.api,
      },
    });
    if (body.errorCode) {
      sails.log.error(new Error(body.message));
      return;
    }
    if (body) {
      for (var key in body) {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
          var key2 = `realtime-${key.replace("_", "-")}`;
          await new Promise(async (resolve) => {
            sails.models.climacell
              .findOrCreate(
                { dataClass: key2 },
                {
                  dataClass: key2,
                  data: body[key]
                    ? `${body[key].value}${
                        body[key].units ? body[key].units : ``
                      }`
                    : null,
                }
              )
              .exec(async (err, record, wasCreated) => {
                if (err) {
                  sails.log.error(err);
                  resolve();
                }
                if (wasCreated) {
                  resolve();
                }

                await sails.models.climacell
                  .update(
                    { dataClass: key2 },
                    {
                      dataClass: key2,
                      data: body[key]
                        ? `${body[key].value}${
                            body[key].units ? body[key].units : ``
                          }`
                        : null,
                    }
                  )
                  .fetch();

                resolve();
              });
          });
        }
      }
    }

    // Nowcast
    let { body } = await got("https://api.climacell.co/v3/weather/nowcast", {
      method: "GET",
      query: {
        lat: sails.config.custom.climacell.position.latitude,
        lon: sails.config.custom.climacell.position.longitude,
        unit_system: sails.config.custom.climacell.unitSystem,
        timestep: 5,
        fields: ["precipitation", "precipitation_type"],
      },
      responseType: "json",
      headers: {
        "Content-Type": "application/json",
        apikey: sails.config.custom.climacell.api,
      },
    });
    if (body.errorCode) {
      sails.log.error(new Error(body.message));
      return;
    }
    if (body && body.constructor === Array) {
      var nowcastMaps = body.map(async (nc, index) => {
        for (var key in nc) {
          if (Object.prototype.hasOwnProperty.call(nc, key)) {
            var key2 = `nc-${index}-${key.replace("_", "-")}`;
            await new Promise(async (resolve) => {
              sails.models.climacell
                .findOrCreate(
                  { dataClass: key2 },
                  {
                    dataClass: key2,
                    data: nc[key]
                      ? `${nc[key].value}${nc[key].units ? nc[key].units : ``}`
                      : null,
                  }
                )
                .exec(async (err, record, wasCreated) => {
                  if (err) {
                    sails.log.error(err);
                    resolve();
                  }
                  if (wasCreated) {
                    resolve();
                  }

                  await sails.models.climacell
                    .update(
                      { dataClass: key2 },
                      {
                        dataClass: key2,
                        data: nc[key]
                          ? `${nc[key].value}${
                              nc[key].units ? nc[key].units : ``
                            }`
                          : null,
                      }
                    )
                    .fetch();

                  resolve();
                });
            });
          }
        }
      });
      await Promise.all(nowcastMaps);
    }

    // Hourly forecast
    let { body } = await got("https://api.climacell.co/v3/weather/hourly", {
      method: "GET",
      query: {
        lat: sails.config.custom.climacell.position.latitude,
        lon: sails.config.custom.climacell.position.longitude,
        unit_system: sails.config.custom.climacell.unitSystem,
        fields: [
          "temp",
          "precipitation",
          "precipitation_type",
          "precipitation_probability",
          "cloud_cover",
          "weather_code",
        ],
      },
      responseType: "json",
      headers: {
        "Content-Type": "application/json",
        apikey: sails.config.custom.climacell.api,
      },
    });
    if (body.errorCode) {
      sails.log.error(new Error(body.message));
      return;
    }
    if (body && typeof body.constructor === Array) {
      var hourlyMaps = body.map(async (hr, index) => {
        for (var key in hr) {
          if (Object.prototype.hasOwnProperty.call(hr, key)) {
            var key2 = `hr-${index}-${key.replace("_", "-")}`;
            await new Promise(async (resolve) => {
              sails.models.climacell
                .findOrCreate(
                  { dataClass: key2 },
                  {
                    dataClass: key2,
                    data: hr[key]
                      ? `${hr[key].value}${hr[key].units ? hr[key].units : ``}`
                      : null,
                  }
                )
                .exec(async (err, record, wasCreated) => {
                  if (err) {
                    sails.log.error(err);
                    resolve();
                  }
                  if (wasCreated) {
                    resolve();
                  }

                  await sails.models.climacell
                    .update(
                      { dataClass: key2 },
                      {
                        dataClass: key2,
                        data: hr[key]
                          ? `${hr[key].value}${
                              hr[key].units ? hr[key].units : ``
                            }`
                          : null,
                      }
                    )
                    .fetch();

                  resolve();
                });
            });
          }
        }
      });
      await Promise.all(hourlyMaps);
    }
  },
};
