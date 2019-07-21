
/* global moment, importScripts */

importScripts(`../../../js/moment.min.js`);

onmessage = function (e) {
    e.data[0].map((item) => {
        try {
            // Array of objects. {type: "clouds" || "rain" || "sleet" || "snow", amount: cloudCover || precipIntensity, temperature: tempreature, visibility: visibility}
            var conditions = [];

            var precipStart = 61;
            var precipEnd = -1;
            var precipType = `precipitation`;

            // Current conditions
            this.postMessage([`setWeatherSlide`, [`weather`, true, `#424242`, `Current Weather`, getConditionIcon(item.currently.icon), `${item.currently.summary}; ${item.currently.temperature}°F`]]);


            // Determine when precipitation is going to fall
            var precipExpected = false;

            item.minutely.data.map((data, index) => {
                if (data.precipType && data.precipProbability >= 0.3) {
                    if (precipStart > index) {
                        precipStart = index;
                        precipType = data.precipType;
                    }
                    precipExpected = true;
                    if (precipEnd < index) { precipEnd = index; }
                }
            });

            if (item.currently.precipType) {
                if (precipStart === 0 && precipEnd >= 59) {
                    this.postMessage([`setWeatherSlide`, [`precipitation`, true, `#4F3C03`, `${item.currently.precipType || `precipitation`} falling!`, `fa-umbrella`, `Rate: ${item.currently.precipIntensity} fluid inches per hour.<br />Will continue to fall for the next hour.`]]);
                } else if (precipStart === 0) {
                    this.postMessage([`setWeatherSlide`, [`precipitation`, true, `#4F3C03`, `${item.currently.precipType || `precipitation`} falling!`, `fa-umbrella`, `Rate: ${item.currently.precipIntensity} fluid inches per hour.<br />Will end at about ${moment(e.data[1]).add(precipEnd, 'minutes').format('h:mmA')}.`]]);
                } else if (precipStart < 61) {
                    this.postMessage([`setWeatherSlide`, [`precipitation`, true, `#0C3B69`, `${item.currently.precipType || `precipitation`} arriving`, `fa-umbrella`, `${precipType || `precipitation`} is possible around ${moment(e.data[1]).add(precipStart, 'minutes').format('h:mmA')}.`]]);
                } else {
                    this.postMessage([`setWeatherSlide`, [`precipitation`, false]]);
                }
            } else {
                if (precipStart < 61) {
                    this.postMessage([`setWeatherSlide`, [`precipitation`, true, `#0C3B69`, `${precipType || `precipitation`} arriving`, `fa-umbrella`, `${precipType || `precipitation`} is possible around ${moment(e.data[1]).add(precipStart, 'minutes').format('h:mmA')}.`]]);
                } else {
                    this.postMessage([`setWeatherSlide`, [`precipitation`, false]]);
                }
            }

            // Determine if it will rain in the next 24 hours.
            // Also generate 48 hour forecast.
            item.hourly.data.map((data, index) => {
                if (data.precipType && data.precipProbability >= 0.1) {
                    conditions[index] = { type: data.precipType, amount: data.precipIntensity, probability: data.precipProbability, temperature: data.temperature, visibility: data.visibility };
                } else {
                    conditions[index] = { type: 'clouds', amount: data.cloudCover, temperature: data.temperature, visibility: data.visibility };
                }
            });
            console.log(conditions);

            // Is it windy?
            if (item.currently.windSpeed >= 73 || item.currently.windGust >= 73) {
                this.postMessage([`setWeatherSlide`, [`wind`, true, `#721818`, `Destructive Winds!`, `fa-wind`, `Current wind speed: ${item.currently.windSpeed}mph, gusts to ${item.currently.windGust}mph.`]]);
            } else if (item.currently.windSpeed >= 55 || item.currently.windGust >= 55) {
                this.postMessage([`setWeatherSlide`, [`wind`, true, `#702700`, `Gale-force Winds!`, `fa-wind`, `Current wind speed: ${item.currently.windSpeed}mph, gusts to ${item.currently.windGust}mph.`]]);
            } else if (item.currently.windSpeed >= 39 || item.currently.windGust >= 39) {
                this.postMessage([`setWeatherSlide`, [`wind`, true, `#4F3C03`, `Windy`, `fa-wind`, `Current wind speed: ${item.currently.windSpeed}mph, gusts to ${item.currently.windGust}mph.`]]);
            } else if (item.currently.windSpeed >= 25 || item.currently.windGust >= 25) {
                this.postMessage([`setWeatherSlide`, [`wind`, true, `#0C3B69`, `Breezy`, `fa-wind`, `Current wind speed: ${item.currently.windSpeed}mph, gusts to ${item.currently.windGust}mph.`]]);
            } else {
                this.postMessage([`setWeatherSlide`, [`wind`, false]]);
            }

            // UV index
            if (item.currently.uvIndex > 10) {
                this.postMessage([`setWeatherSlide`, [`uv`, true, `#721818`, `Extreme UV Index!`, `fa-sun`, `Unprotected skin can burn within 10 minutes. Stay indoors if you can.`]]);
            } else if (item.currently.uvIndex >= 8) {
                this.postMessage([`setWeatherSlide`, [`uv`, true, `#702700`, `Severe UV Index!`, `fa-sun`, `Unprotected skin can burn within 20 minutes.`]]);
            } else if (item.currently.uvIndex >= 6) {
                this.postMessage([`setWeatherSlide`, [`uv`, true, `#4F3C03`, `High UV Index`, `fa-sun`, `Unprotected skin can burn within 30 minutes.`]]);
            } else {
                this.postMessage([`setWeatherSlide`, [`uv`, false]]);
            }

            // Visibility
            if (item.currently.visibility <= 0.25) {
                this.postMessage([`setWeatherSlide`, [`visibility`, true, `#721818`, `Dangerous Visibility!`, `fa-car`, `Visibility is only ${item.currently.visibility} miles. Do not drive if possible.`]]);
            } else if (item.currently.visibility <= 1) {
                this.postMessage([`setWeatherSlide`, [`visibility`, true, `#702700`, `Very Low Visibility!`, `fa-car`, `Visibility is only ${item.currently.visibility} miles. Be careful and drive slowly.`]]);
            } else if (item.currently.visibility <= 3) {
                this.postMessage([`setWeatherSlide`, [`visibility`, true, `#4F3C03`, `Low Visibility`, `fa-car`, `Visibility is only ${item.currently.visibility} miles. Be cautious on the roads.`]]);
            } else {
                this.postMessage([`setWeatherSlide`, [`visibility`, false]]);
            }

            // Apparent temperature, cold
            if (item.currently.apparentTemperature <= -48) {
                this.postMessage([`setWeatherSlide`, [`windchill`, true, `#721818`, `Dangerous Wind Chill!`, `fa-temperature-low`, `Wind Chill is ${item.currently.apparentTemperature}°F. Frostbite can occur within 10 minutes.`]]);
            } else if (item.currently.apparentTemperature <= -32) {
                this.postMessage([`setWeatherSlide`, [`windchill`, true, `#702700`, `Very Low Wind Chill!`, `fa-temperature-low`, `Wind Chill is ${item.currently.apparentTemperature}°F. Frostbite can occur within 20 minutes.`]]);
            } else if (item.currently.apparentTemperature <= -18) {
                this.postMessage([`setWeatherSlide`, [`windchill`, true, `#4F3C03`, `Low Wind Chill`, `fa-temperature-low`, `Wind Chill is ${item.currently.apparentTemperature}°F. Frostbite can occur within 30 minutes.`]]);
            } else {
                this.postMessage([`setWeatherSlide`, [`windchill`, false]]);
            }

            // Apparent temperature, hot
            if (item.currently.apparentTemperature >= 115) {
                this.postMessage([`setWeatherSlide`, [`heatindex`, true, `#721818`, `Dangerous Heat Index!`, `fa-temperature-high`, `Heat Index is ${item.currently.apparentTemperature}°F. Heat stroke can occur; stay cool indoors if possible.`]]);
            } else if (item.currently.apparentTemperature >= 103) {
                this.postMessage([`setWeatherSlide`, [`heatindex`, true, `#702700`, `Very High Heat Index!`, `fa-temperature-high`, `Heat Index is ${item.currently.apparentTemperature}°F. Drink lots of water and take a cooling break every 30 minutes.`]]);
            } else if (item.currently.apparentTemperature >= 91) {
                this.postMessage([`setWeatherSlide`, [`heatindex`, true, `#4F3C03`, `High Heat Index`, `fa-temperature-high`, `Heat Index is ${item.currently.apparentTemperature}°F. Drink extra water.`]]);
            } else {
                this.postMessage([`setWeatherSlide`, [`heatindex`, false]]);
            }


            // Generate 48 hour forecast
            var temp = ``;
            var theTime = moment(e.data[1]).startOf('hour');
            var shadeColor = ``;
            var innerIcon = ``;
            var conversionRatio = 1;
            for (var i = 0; i < 48; i++) {
                theTime = moment(e.data[1]).add(i, 'hours');

                // Add label, vertical line, and temperature at every 3rd hour.
                if (i % 3 === 0) {
                    temp += `
                    <div class="text-white" style="position: absolute; left: ${i > 0 ? (((i) / 48) - (1 / 96)) * 100 : 0}%; top: 0%; font-size: 1.5vh;">${moment(theTime).hours() < 3 ? moment(theTime).format('hA dd') : moment(theTime).format('hA')}</div>
                    <div class="text-white" style="position: absolute; left: ${i > 0 ? (((i) / 48) - (1 / 96)) * 100 : 0}%; top: 66%; font-size: 1.5vh;">${Math.round(conditions[i].temperature || 0)}°F</div>
                    `;
                }

                // Add shading depending on the condition
                shadeColor = ``;
                switch (conditions[i].type) {
                    case 'clouds':
                        if (conditions[i].amount > 0.66) {
                            shadeColor = `#786207`;
                            innerIcon = `<span class="text-white" style="font-size: 1em;"><i class="fas fa-cloud"></i></span>`;
                        } else if (conditions[i].amount >= 0.33) {
                            shadeColor = `#F1C40F`;
                            innerIcon = `<span class="text-dark" style="font-size: 1em;"><i class="fas fa-cloud-sun"></i></span>`;
                        } else {
                            shadeColor = `#F8E187`;
                            innerIcon = `<span class="text-dark" style="font-size: 1em;"><i class="fas fa-sun"></i></span>`;
                        }
                        break;
                    case 'rain':
                        if (conditions[i].probability >= 0.7) {
                            shadeColor = `#1A4C6D`;
                            innerIcon = `<span class="text-white" style="font-size: 1em;"><i class="fas fa-cloud-rain"></i></span>`;
                        } else if (conditions[i].probability >= 0.4) {
                            shadeColor = `#3498DB`;
                            innerIcon = `<span class="text-white" style="font-size: 1em;"><i class="fas fa-cloud-showers-heavy"></i></span>`;
                        } else {
                            shadeColor = `#99CBED`;
                            innerIcon = `<span class="text-dark" style="font-size: 1em;"><i class="fas fa-cloud-sun-rain"></i></span>`;
                        }
                        break;
                    case 'snow':
                        if (conditions[i].probability >= 0.7) {
                            shadeColor = `#7C7C7C`;
                            innerIcon = `<span class="text-white" style="font-size: 1em;"><i class="fas fa-snowman"></i></span>`;
                        } else if (conditions[i].probability >= 0.4) {
                            shadeColor = `#C6C6C6`;
                            innerIcon = `<span class="text-dark" style="font-size: 1em;"><i class="fas fa-snowflake"></i></span>`;
                        } else {
                            shadeColor = `#F8F8F8`;
                            innerIcon = `<span class="text-dark" style="font-size: 1em;"><i class="far fa-snowflake"></i></span>`;
                        }
                        break;
                    case 'sleet':
                        if (conditions[i].probability >= 0.7) {
                            shadeColor = `#780E35`;
                            innerIcon = `<span class="text-white" style="font-size: 1em;"><i class="fas fa-igloo"></i></span>`;
                        } else if (conditions[i].probability >= 0.4) {
                            shadeColor = `#F01D6A`;
                            innerIcon = `<span class="text-white" style="font-size: 1em;"><i class="fas fa-icicles"></i></span>`;
                        } else {
                            shadeColor = `#F78EB4`;
                            innerIcon = `<span class="text-dark" style="font-size: 1em;"><i class="fas fa-icicles"></i></span>`;
                        }
                        break;
                }
                temp += `<div style="position: absolute; background-color: ${shadeColor}; width: ${(1 / 48) * 100}%; height: 2em; left: ${((i) / 48) * 100}%; top: 25%;"></div>
                <div style="position: absolute; left: ${((i) / 48) * 100}%; top: 35%;">${innerIcon}</div>`;
            }

            this.postMessage([`forecastGraph`, temp]);

        } catch (e) {
            console.error(e);
        }
    });
};

function getConditionIcon(condition) {
    switch (condition) {
        case 'clear-day':
            return 'fa-sun';
        case 'clear-night':
            return 'fa-moon';
        case 'rain':
            return 'fa-cloud-showers-heavy';
        case 'snow':
            return 'fa-snowflake';
        case 'sleet':
            return 'fa-cloud-meatball';
        case 'wind':
            return 'fa-wind';
        case 'fog':
            return 'fa-smog';
        case 'cloudy':
            return 'fa-cloud';
        case 'partly-cloudy-day':
            return 'fa-cloud-sun';
        case 'partly-cloudy-night':
            return 'fa-cloud-moon';
        case 'thunderstorm':
            return 'fa-bolt';
        case 'showers-day':
            return 'fa-cloud-sun-rain';
        case 'showers-night':
            return 'fa-cloud-moon-rain';
        default:
            return 'fa-rainbow';
    }
}
