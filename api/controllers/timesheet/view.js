/* global sails, moment */

module.exports = async function public(req, res) {
    sails.log.debug('Controller timesheet/view called.');
    return res.view('timesheet/layout', {layout: 'timesheet/home', currentDate: moment().format("MM-DD-YYYY")});
};