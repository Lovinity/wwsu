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
  'attendance/*': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
  'attendance/get': ['isBanned', 'isSocket', 'isAuthorizedHost'],
  'calendar/*': 'isBanned',
  'calendar/remove': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
  'config/*': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
  'config/categories/get-available': ['isBanned', 'isSocket', 'isAuthorizedHost'],
  'config/get': ['isBanned', 'isSocket', 'isAuthorizedHost'],
  'darksky/get': 'isBanned',
  'directors/*': ['isBanned', 'isSocket', 'isAuthorizedAdminDirector'],
  'directors/get': 'isBanned',
  'directors/get-hours': 'isBanned',
  'directors/remove-hours': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
  'discipline/edit': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
  'discipline/remove': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
  'display/public': 'isBanned',
  'display/internal': 'isBanned',
  'djs/*': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
  'djs/get': ['isBanned', 'isSocket'],
  'djs/get-web': ['isBanned', 'isSocket', 'isAuthorizedDJ'],
  'eas/*': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
  'eas/get': 'isBanned',
  'embeds/guardian': 'isBanned',
  'hosts/*': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
  'hosts/get': ['isBanned', 'isSocket', 'isAuthorizedHost'],
  listen: 'isBanned',
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
  'sports/football': 'isBanned',
  'sports/basketball': 'isBanned',
  'sports/football-remote': 'isBanned',
  'sports/basketball-remote': 'isBanned',
  'state/change-radio-dj': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
  'status/get': ['isBanned', 'isSocket'],
  'subscribers/*': ['isBanned', 'isSocket'],
  'subscribers/add-directors': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
  'subscribers/remove-directors': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
  'timesheet/add': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
  'timesheet/edit': ['isBanned', 'isSocket', 'isAuthorizedAdminDirector'],
  'timesheet/get': ['isBanned', 'isSocket'],
  'timesheet/remove': ['isBanned', 'isSocket', 'isAuthorizedAdminDirector'],
  'timesheet/view': 'isBanned',
  'underwritings/*': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
  'underwritings/get': ['isBanned', 'isSocket'],
  'xp/*': ['isBanned', 'isSocket', 'isAuthorizedDirector'],
  'xp/get': ['isBanned', 'isSocket', 'isAuthorizedHost']
}
