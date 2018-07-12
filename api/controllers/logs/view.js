/* global sails, moment */

module.exports = async function public(req, res) {
    sails.log.debug('Controller logs/view called.');
    return res.view('logs/home', {layout: 'logs/layout', currentDate: moment().format("MM-DD-YYYY")});
};

