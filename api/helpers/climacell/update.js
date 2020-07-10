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
    var realtime = await needle(
      "get",
      `https://api.climacell.co/v3/weather/realtime`,
      {
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
      {
        headers: {
          "Content-Type": "application/json",
          apikey: sails.config.custom.climacell.api,
        },
      }
    );
    if (realtime.body) {
      for (var key in realtime.body) {
        if (Object.prototype.hasOwnProperty.call(realtime, key)) {
          var key2 = `realtime-${key.replace("_", "-")}`;
          await new Promise(async (resolve) => {
            sails.models.climacell
              .findOrCreate(
                { dataClass: key2 },
                {
                  dataClass: key2,
                  data: realtime[key]
                    ? `${realtime[key].value}${
                        realtime[key].units ? realtime[key].units : ``
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
                      data: realtime[key]
                        ? `${realtime[key].value}${
                            realtime[key].units ? realtime[key].units : ``
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
    var nowcast = await needle(
      "get",
      `https://api.climacell.co/v3/weather/nowcast`,
      {
        lat: sails.config.custom.climacell.position.latitude,
        lon: sails.config.custom.climacell.position.longitude,
        unit_system: sails.config.custom.climacell.unitSystem,
        timestep: 5,
        fields: ["precipitation", "precipitation_type"],
      },
      {
        headers: {
          "Content-Type": "application/json",
          apikey: sails.config.custom.climacell.api,
        },
      }
    );
    if (nowcast.body && typeof nowcast.body.map === "function") {
      var nowcastMaps = nowcast.body.map(async (nc, index) => {
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
    var hourly = await needle(
      "get",
      `https://api.climacell.co/v3/weather/hourly`,
      {
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
      {
        headers: {
          "Content-Type": "application/json",
          apikey: sails.config.custom.climacell.api,
        },
      }
    );
    if (hourly.body && typeof hourly.body.map === "function") {
      var hourlyMaps = hourly.body.map(async (hr, index) => {
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
