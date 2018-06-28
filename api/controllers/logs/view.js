/* global sails, moment */

module.exports = async function public(req, res) {
    sails.log.debug('Controller logs/view called.');
    return res.view('logs/layout', {layout: 'logs/home', currentDate: moment().format("MM-DD-YYYY")});
};

