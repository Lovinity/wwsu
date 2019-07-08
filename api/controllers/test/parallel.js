module.exports = {

    friendlyName: 'parallel',

    description: 'parallel test.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        var output = ``;
        var initTime = moment().valueOf();
        var func1 = function () {
            return new Promise(async (resolve) => {
                output += `Started func1... `;
                await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'test', loglevel: 'primary', logsubtype: '', event: 'This is a test log called from parallel.js'}).fetch()
                        .tolerate((err) => {
                            sails.log.error(err);
                        });
                output += `FINISHED func1... `;
                return resolve();
            });
        };

        var func2 = function () {
            return new Promise(async (resolve) => {
                output += `Started func2... `;
                var queue = await sails.helpers.rest.getQueue();
                var stuff = [];
                queue.map(test => stuff.push(test.ID));
                output += `FINISHED func2... `;
                return resolve();
            });
        };

        var func3 = function () {
            return new Promise(async (resolve) => {
                output += `Started func3... `;
                var addition = 0;
                for (var i = 0; i < 1000000; i++)
                {
                    addition += addition + 2;
                }
                output += `FINISHED func3... `;
                return resolve();
            });
        };
        var func4 = function () {
            return new Promise(async (resolve) => {
                output += `Started func4... `;
                for (var i = 0; i < 1000; i++)
                {
                    addition += moment().valueOf();
                }
                output += `FINISHED func4... `;
                return resolve();
            });
        };
        await Promise.all([func1(), func2(), func3(), func4()])
                .then(async () => {
                    output += `PARALLEL TEST FINISHED. Time: ${moment().valueOf() - initTime}... `;

                    initTime = moment().valueOf();

                    await func1();
                    await func2();
                    await func3();
                    await func4();

                    output += `SYNC TEST FINISHED. Time: ${moment().valueOf() - initTime}... `;

                    return exits.success(output);
                })
                .catch((err) => {
                    return exits.error(err);
                });

    }


};
