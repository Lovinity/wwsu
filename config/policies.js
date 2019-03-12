/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your actions.
 *
 * For more information on configuring policies, check out:
 * https://sailsjs.com/docs/concepts/policies
 */

module.exports.policies = {

    /***************************************************************************
     *                                                                          *
     * Default policy for all controllers and actions, unless overridden.       *
     * (`true` allows public access)                                            *
     *                                                                          *
     ***************************************************************************/

    '*': ['isBanned', 'isSocket', 'isAuthorizedHost'], // Everything resctricted here
    'auth/*': ['isBanned', 'isSocket'],
    'analytics/weekly-dj': ['isBanned', 'isSocket'],
    'announcements/*': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
    'announcements/add-problem': ['isBanned', 'isSocket', 'isAuthorizedHost'],
    'announcements/get': ['isBanned', 'isSocket'],
    'calendar/*': 'isBanned',
    'directors/*': ['isBanned', 'isSocket', 'isAuthorizedAdminDirector'],
    'directors/get': 'isBanned',
    'directors/get-hours': 'isBanned',
    'discipline/edit': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
    'discipline/remove': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
    'display/public': 'isBanned',
    'display/internal': 'isBanned',
    'djs/*': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
    'djs/get': ['isBanned', 'isSocket'],
    'eas/*': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
    'eas/get': 'isBanned',
    'embeds/guardian': 'isBanned',
    'hosts/*': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
    'hosts/get': ['isBanned', 'isSocket', 'isAuthorizedHost'],
    'listen': 'isBanned',
    'listen/*': 'isBanned',
    'messages/get-web': ['isBanned', 'isSocket'],
    'messages/send-web': ['isBanned', 'isSocket'],
    'meta/get': 'isBanned',
    'recipients/add-display': ['isBanned', 'isSocket'],
    'recipients/add-web': ['isBanned', 'isSocket'],
    'recipients/edit-web': ['isBanned', 'isSocket'],
    'requests/place': ['isBanned', 'isSocket'],
    'songs/get': ['isBanned', 'isSocket'],
    'songs/get-genres': ['isBanned', 'isSocket'],
    'songs/get-liked': ['isBanned', 'isSocket'],
    'songs/like': ['isBanned', 'isSocket'],
    'sports/get': ['isBanned', 'isSocket'],
    'sports/update': ['isBanned', 'isSocket'],
    'sports/men-finals': 'isBanned',
    'sports/women-finals': 'isBanned',
    'sports/remote': 'isBanned',
    'state/change-radio-dj': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
    'status/get': ['isBanned', 'isSocket'],
    'timesheet/add': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
    'timesheet/edit': ['isBanned', 'isSocket', 'isAuthorizedAdminDirector'],
    'timesheet/get': ['isBanned', 'isSocket'],
    'timesheet/view': 'isBanned',
    'uab/directors/*': ['isBanned', 'isSocket', 'isAuthorizedAdminDirectorUab'],
    'uab/directors/get': 'isBanned',
    'uab/timesheet/add': ['isBanned', 'isSocket', 'isAuthorizedDirectorUab'],
    'uab/timesheet/edit': ['isBanned', 'isSocket', 'isAuthorizedAdminDirectorUab'],
    'uab/timesheet/get': ['isBanned', 'isSocket'],
    'uab/timesheet/view': 'isBanned',
    'xp/*': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
    'xp/get': ['isBanned', 'isSocket', 'isAuthorizedHost']
};
