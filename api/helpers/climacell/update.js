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

    var records = await sails.models.climacell.find();

    // Start with real-time data
    var { body } = await got("https://api.climacell.co/v3/weather/realtime", {
      method: "GET",
      searchParams: {
        lat: sails.config.custom.climacell.position.latitude,
        lon: sails.config.custom.climacell.position.longitude,
        unit_system: sails.config.custom.climacell.unitSystem,
        fields:
          "temp,feels_like,humidity,dewpoint,wind_speed,wind_direction,wind_gust,precipitation,precipitation_type,visibility,cloud_cover,weather_code,epa_health_concern,road_risk_score",
      },
      responseType: "json",
      headers: {
        "Content-Type": "application/json",
        apikey: sails.config.custom.climacell.api,
      },
    });
    if (body.errorCode) {
      sails.log.error(new Error(body));
      return;
    }
    if (body) {
      for (let key in body) {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
          let key2 = `realtime-${key.replace("_", "-")}`;
          await new Promise(async (resolve) => {
            let data = body[key]
              ? `${body[key].value}${
                  body[key].units ? ` ${body[key].units}` : ``
                }`
              : null;
            sails.models.climacell
              .findOrCreate(
                { dataClass: key2 },
                {
                  dataClass: key2,
                  data: data,
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

                let original = records.find(
                  (record) => record.dataClass === key2
                );
                if (!original || original.data !== data) {
                  await sails.models.climacell
                    .update(
                      { dataClass: key2 },
                      {
                        dataClass: key2,
                        data: data,
                      }
                    )
                    .fetch();
                }

                resolve();
              });
          });
        }
      }
    }

    // Nowcast
    var { body } = await got("https://api.climacell.co/v3/weather/nowcast", {
      method: "GET",
      searchParams: {
        lat: sails.config.custom.climacell.position.latitude,
        lon: sails.config.custom.climacell.position.longitude,
        unit_system: sails.config.custom.climacell.unitSystem,
        timestep: 5,
        fields: "precipitation,precipitation_type",
      },
      responseType: "json",
      headers: {
        "Content-Type": "application/json",
        apikey: sails.config.custom.climacell.api,
      },
    });
    if (body.errorCode) {
      sails.log.error(new Error(body));
      return;
    }
    if (body && body.constructor === Array) {

      var nowcastMaps = body.map(async (nc, index) => {
        for (let key in nc) {
          if (Object.prototype.hasOwnProperty.call(nc, key)) {
            let key2 = `nc-${index}-${key.replace("_", "-")}`;
            
            await new Promise(async (resolve) => {
              let data = nc[key]
                ? `${nc[key].value}${nc[key].units ? ` ${nc[key].units}` : ``}`
                : null;
              sails.models.climacell
                .findOrCreate(
                  { dataClass: key2 },
                  {
                    dataClass: key2,
                    data: data,
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

                  let original = records.find(
                    (record) => record.dataClass === key2
                  );
                  if (!original || original.data !== data) {
                    await sails.models.climacell
                      .update(
                        { dataClass: key2 },
                        {
                          dataClass: key2,
                          data: data,
                        }
                      )
                      .fetch();
                  }

                  resolve();
                });
            });
          }
        }
      });
      await Promise.all(nowcastMaps);
    }

    // Hourly forecast
    var { body } = await got(
      "https://api.climacell.co/v3/weather/forecast/hourly",
      {
        method: "GET",
        searchParams: {
          lat: sails.config.custom.climacell.position.latitude,
          lon: sails.config.custom.climacell.position.longitude,
          unit_system: sails.config.custom.climacell.unitSystem,
          fields:
            "temp,precipitation,precipitation_type,precipitation_probability,cloud_cover,weather_code",
        },
        responseType: "json",
        headers: {
          "Content-Type": "application/json",
          apikey: sails.config.custom.climacell.api,
        },
      }
    );

    if (body.errorCode) {
      sails.log.error(new Error(body));
      return;
    }

    if (body && typeof body.constructor === Array) {

      var hourlyMaps = body.map(async (hr, index) => {
        for (let key in hr) {
          if (Object.prototype.hasOwnProperty.call(hr, key)) {
            let key2 = `hr-${index}-${key.replace("_", "-")}`;

            await new Promise(async (resolve) => {
              let data = hr[key]
                ? `${hr[key].value || hr[key]}${hr[key].units ? ` ${hr[key].units}` : ``}`
                : null;
              sails.models.climacell
                .findOrCreate(
                  { dataClass: key2 },
                  {
                    dataClass: key2,
                    data: data,
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

                  let original = records.find(
                    (record) => record.dataClass === key2
                  );
                  if (!original || original.data !== data) {
                    await sails.models.climacell
                      .update(
                        { dataClass: key2 },
                        {
                          dataClass: key2,
                          data: data,
                        }
                      )
                      .fetch();
                  }

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
