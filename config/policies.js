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

  "*": ["isBanned", "isSocket", "isAuthorizedHost"], // Everything resctricted here
  "auth/*": ["isBanned", "isSocket"],
  "analytics/weekly-dj": ["isBanned", "isSocket"],
  "announcements/*": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "announcements/get": ["isBanned", "isSocket"],
  "attendance/*": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "attendance/get": ["isBanned", "isSocket", "isAuthorizedHost"],
  "calendar/*": ["isBanned", "isSocket"],
  "calendar/get-events-playlists": ["isBanned", "isSocket"],
  "calendar/add": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "calendar/add-schedule": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "calendar/cancel-web": ["isBanned", "isSocket", "isAuthorizedDJ"],
  "calendar/change-topic-web": ["isBanned", "isSocket", "isAuthorizedDJ"],
  "calendar/edit-schedule": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "calendar/edit": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "calendar/remove-schedule": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "calendar/remove": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "climacell/get": "isBanned",
  "clockwheels/*": ["isBanned", "isSocket", "isAuthorizedDJ"],
  "clockwheels/get": ["isBanned", "isSocket"],
  "config/*": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "config/categories/get-available": [
    "isBanned",
    "isSocket",
    "isAuthorizedHost"
  ],
  "config/get": ["isBanned", "isSocket", "isAuthorizedHost"],
  "darksky/get": "isBanned",
  directors: "isBanned",
  "directors/*": ["isBanned", "isSocket", "isAuthorizedAdminDirector"],
  "directors/calendar": "isBanned",
  "directors/timesheet": "isBanned",
  "directors/get": "isBanned",
  "discipline/acknowledge": true,
  "discipline/edit": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "discipline/get-web": true,
  "discipline/remove": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "display/public": "isBanned",
  "display/internal": "isBanned",
  dj: "isBanned",
  "djs/*": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "djs/get": ["isBanned", "isSocket"],
  "djs/get-web": ["isBanned", "isSocket", "isAuthorizedDJ"],
  "eas/*": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "eas/get": "isBanned",
  "email/*": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "embeds/guardian": "isBanned",
  "embeds/guardian-ad": "isBanned",
  "hosts/*": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "hosts/get": ["isBanned", "isSocket", "isAuthorizedHost"],
  "inventory/*": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "inventory/get": ["isBanned", "isSocket", "isAuthorizedHost"],
  listen: true,
  "listen/*": true,
  "logs/edit": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "logs/get-dj": ["isBanned", "isSocket", "isAuthorizedDJ"],
  "messages/get-web": ["isBanned", "isSocket"],
  "messages/send-web": ["isBanned", "isSocket"],
  "meta/get": "isBanned",
  "recipients/add-display": ["isBanned", "isSocket"],
  "recipients/add-web": ["isBanned", "isSocket"],
  "recipients/edit-web": ["isBanned", "isSocket"],
  "requests/place": ["isBanned", "isSocket"],
  "shootout/get": ["isBanned", "isSocket"],
  "shootout/set": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "songs/get": ["isBanned", "isSocket"],
  "songs/get-genres": ["isBanned", "isSocket"],
  "songs/get-liked": ["isBanned", "isSocket"],
  "songs/like": ["isBanned", "isSocket"],
  "sports/get": ["isBanned", "isSocket"],
  "sports/update": ["isBanned", "isSocket"],
  "sports/football": "isBanned",
  "sports/basketball": "isBanned",
  "sports/football-remote": "isBanned",
  "sports/basketball-remote": "isBanned",
  "state/change-radio-dj": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "status/get": ["isBanned", "isSocket"],
  "status/recorder": ["isBanned", "isSocket", "isAuthorizedHost"],
  "status/report": ["isBanned", "isSocket"],
  "subscribers/*": ["isBanned", "isSocket"],
  "subscribers/add-directors": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "subscribers/remove-directors": [
    "isBanned",
    "isSocket",
    "isAuthorizedDirector"
  ],
  "timesheet/add": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "timesheet/edit": ["isBanned", "isSocket", "isAuthorizedAdminDirector"],
  "timesheet/get": ["isBanned", "isSocket"],
  "timesheet/remove": ["isBanned", "isSocket", "isAuthorizedAdminDirector"],
  "timesheet/view": "isBanned",
  "uab/directors/*": ["isBanned", "isSocket", "isAuthorizedAdminDirectorUab"],
  "uab/directors/get": "isBanned",
  "uab/timesheet/add": ["isBanned", "isSocket", "isAuthorizedDirectorUab"],
  "uab/timesheet/edit": [
    "isBanned",
    "isSocket",
    "isAuthorizedAdminDirectorUab"
  ],
  "uab/timesheet/get": ["isBanned", "isSocket"],
  "uab/timesheet/view": "isBanned",
  "underwritings/*": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "underwritings/get": ["isBanned", "isSocket"],
  "version/edit": ["isBanned", "isSocket", "isAuthorizedAdminDirector"],
  "xp/*": ["isBanned", "isSocket", "isAuthorizedDirector"],
  "xp/get": ["isBanned", "isSocket", "isAuthorizedHost"]
};
