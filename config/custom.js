/* global moment */

/**
 * Custom configuration
 * (sails.config.custom)
 *
 * One-off settings specific to your application.
 *
 * For more information on custom configuration, visit:
 * https://sailsjs.com/config/custom
 */

// Declare global variables for a couple common libraries.
global[ 'moment' ] = require('moment-timezone')
require('moment-duration-format')
require('moment-recur-ts')
global[ 'needle' ] = require('needle')
const WWSU = require("../assets/plugins/wwsu-sails/js/wwsu.js");
global[ 'WWSUqueue' ] = new WWSU.WWSUqueue();

// Declare the break task schema
const breakTaskSchema = [
  // Logs
  {
    properties: {
      task: {
        type: 'string',
        const: "log",
        description: "The task to perform."
      },
      event: {
        type: "string",
        description: "The log entry to insert."
      }
    },
    required: [ "task", "event" ]
  },

  // queue Requests
  {
    properties: {
      task: {
        type: 'string',
        const: "queueRequests",
        description: "The task to perform."
      },
      quantity: {
        type: 'number',
        minimum: 1,
        description: "The number of tracks to queue."
      }
    },
    required: [ "task", "quantity" ]
  },

  // queue
  {
    properties: {
      task: {
        type: 'string',
        const: "queue",
        description: "The task to perform."
      },
      quantity: {
        type: 'number',
        minimum: 1,
        description: "The number of tracks to queue."
      },
      category: {
        type: 'string',
        description: "The name of the category to queue from as defined in the categories config."
      },
      rules: {
        type: "boolean",
        description: "Whether or not to enforce playlist rotation rules."
      }
    },
    required: [ "task", "quantity", "category" ]
  },

  // queue Duplicates
  {
    properties: {
      task: {
        type: 'string',
        const: "queueDuplicates",
        description: "The task to perform."
      },
    },
    required: [ "task" ]
  },

  // queue Underwritings
  {
    properties: {
      task: {
        type: 'string',
        const: "queueUnderwritings",
        description: "The task to perform."
      },
      quantity: {
        type: 'number',
        minimum: 1,
        description: "The number of tracks to queue."
      },
    },
    required: [ "task", "quantity" ]
  },
];

// Declare config store
const Conf = require('conf');

// Create and export the config store
module.exports.custom = new Conf({

  // We want an error to be thrown if the config file is corrupt
  clearInvalidConfig: false,

  // TODO: Keep this up to date by adding any/all changes to the schema here (and bumping the version). Use >= syntax.
  migrations: {

  },

  schema: {

    website: {
      type: 'string',
      format: 'uri',
      default: 'https://wwsu1069.org',
      description: "The full URL to the WWSU website, used by the status system to check if it is online.",
    },

    stream: {
      type: 'string',
      format: 'uri',
      default: 'https://server.wwsu1069.org/shoutcast',
      description: "The full URL to the Shoutcast internet stream server, used for status checking and counting online listeners."
    },

    hostSecret: {
      type: 'string',
      default: 'WWSU1069',
      description: "A secret key used to obfuscate host IP addresses in the API. WARNING! Changing this will invalidate active discipline."
    },

    startOfSemester: {
      type: "string",
      format: "date-time",
      default: moment('2019-01-14 00:00:00').toISOString(true),
      description: "The date/time the current semester started, used for analytics."
    },

    onesignal: {
      type: "object",
      additionalProperties: false,
      description: "OneSignal manages push notifications for radio shows and accountability.",
      properties: {
        rest: {
          type: "string",
          default: "",
          description: "The REST API key for OneSignal app."
        },
        app: {
          type: "string",
          default: "",
          description: "The OneSignal app ID."
        }
      },
      required: [ "rest", "app" ]
    },

    darksky: {
      type: "object",
      additionalProperties: false,
      description: "DEPRECATED: Config for Darksky weather API.",
      properties: {
        api: {
          type: "string",
          default: "",
          description: "The Darksky API key."
        },
        unitSystem: {
          type: "string",
          default: "us",
          description: "What units of measurement should be returned from Climacell."
        },
        position: {
          type: "object",
          description: "The location information to get weather.",
          properties: {
            latitude: {
              type: "number",
              minimum: -180,
              maximum: 180,
              default: 39.7800196
            },
            longitude: {
              type: "number",
              minimum: -180,
              maximum: 180,
              default: -84.0599189
            },
          },
          required: [ "latitude", "longitude" ]
        }
      },
      required: [ "api", "position" ]
    },

    climacell: {
      type: "object",
      additionalProperties: false,
      description: "Config for Climacell weather API.",
      properties: {
        api: {
          type: "string",
          default: "",
          description: "The Climacell API key."
        },
        position: {
          type: "object",
          description: "The location information to get weather.",
          properties: {
            latitude: {
              type: "number",
              minimum: -180,
              maximum: 180,
              default: 39.7800196
            },
            longitude: {
              type: "number",
              minimum: -180,
              maximum: 180,
              default: -84.0599189
            },
          },
          required: [ "latitude", "longitude" ]
        }
      },
      required: [ "api", "unitSystem", "position" ]
    },

    categories: {
      type: "object",
      description: "These properties tie RadioDJ track categories and subcategories in with category names (the object key) used by the system.",

      // System categories
      properties: {
        music: {
          type: "object",
          description: "The music property defines what tracks in RadioDJ are considered music (and therefore can be requested by the track request system).",
          additionalProperties: {
            type: "array",
            description: "Each property (RadioDJ main category) contains an array of subcategories to attribute. An empty array means to use all subcategories.",
            items: {
              type: "string"
            }
          },
          default: {
            "Music": [],
            "Top Adds": []
          }
        },

        adds: {
          type: "object",
          description: "Top Adds (music for high promotion); a random track from this will play when a DJ clicks to play a Top Add in wwsu-dj-controls.",
          additionalProperties: {
            type: "array",
            description: "Each property (RadioDJ main category) contains an array of subcategories to attribute. An empty array means to use all subcategories.",
            items: {
              type: "string"
            }
          },
          default: {
            "Top Adds": []
          }
        },

        IDs: {
          type: "object",
          description: "The tracks considered to follow the FCC definition of a legal station ID (Call letters, frequency, market locations). System monitors to make sure one plays around (+- 5 minutes) the top of every hour and logs when that does not happen.",
          additionalProperties: {
            type: "array",
            description: "Each property (RadioDJ main category) contains an array of subcategories to attribute. An empty array means to use all subcategories.",
            items: {
              type: "string"
            }
          },
          default: {
            'Station IDs': [ 'Standard IDs' ]
          }
        },

        PSAs: {
          type: "object",
          description: "A public service announcement which promotes a non-profit organization, social issue, or cause. These are usually played during breaks.",
          additionalProperties: {
            type: "array",
            description: "Each property (RadioDJ main category) contains an array of subcategories to attribute. An empty array means to use all subcategories.",
            items: {
              type: "string"
            }
          },
          default: {
            "PSAs": [],
          }
        },

        sweepers: {
          type: "object",
          description: "Fun non-legal station IDs.",
          additionalProperties: {
            type: "array",
            description: "Each property (RadioDJ main category) contains an array of subcategories to attribute. An empty array means to use all subcategories.",
            items: {
              type: "string"
            }
          },
          default: {
            "Sweepers": [ "Break Sweepers" ],
          }
        },

        underwritings: {
          type: "object",
          description: "Paid or non-paid sponsorship messages to be aired often at certain times/days and/or for certain number of spins. System uses this to determine which tracks may be selected for use in underwriting scheduling.",
          additionalProperties: {
            type: "array",
            description: "Each property (RadioDJ main category) contains an array of subcategories to attribute. An empty array means to use all subcategories.",
            items: {
              type: "string"
            }
          },
          default: {
            "Commercials": [],
          }
        },

        liners: {
          type: "object",
          description: "A short ( < 7 seconds) audio clip played periodically between songs telling listeners what station they are listening to.",
          additionalProperties: {
            type: "array",
            description: "Each property (RadioDJ main category) contains an array of subcategories to attribute. An empty array means to use all subcategories.",
            items: {
              type: "string"
            }
          },
          default: {
            "Liners": [ "Standard Liners" ],
          }
        },

        requestLiners: {
          type: "object",
          description: "A random request liner is played before requested tracks are aired.",
          additionalProperties: {
            type: "array",
            description: "Each property (RadioDJ main category) contains an array of subcategories to attribute. An empty array means to use all subcategories.",
            items: {
              type: "string"
            }
          },
          default: {
            "Liners": [ "Request Liners" ],
          }
        },

        promos: {
          type: "object",
          description: "Advertisements for the shows and programming that airs on the station.",
          additionalProperties: {
            type: "array",
            description: "Each property (RadioDJ main category) contains an array of subcategories to attribute. An empty array means to use all subcategories.",
            items: {
              type: "string"
            }
          },
          default: {
            "Promos": [ "Radio Show Promos" ],
          }
        },

        halftime: {
          type: "object",
          description: "Upbeat music played during halftime and extended breaks in sports broadcasts.",
          additionalProperties: {
            type: "array",
            description: "Each property (RadioDJ main category) contains an array of subcategories to attribute. An empty array means to use all subcategories.",
            items: {
              type: "string"
            }
          },
          default: {
            'Sports Music': [ 'Halftime and Break Music' ]
          }
        },

        technicalIssues: {
          type: "object",
          description: "Generic liners (eg. 'We apologize for the technical issues. We will be right back.') played when the system sends itself into break due to a technical issue (such as a remote stream disconnecting during a broadcast).",
          additionalProperties: {
            type: "array",
            description: "Each property (RadioDJ main category) contains an array of subcategories to attribute. An empty array means to use all subcategories.",
            items: {
              type: "string"
            }
          },
          default: {
            "Liners": [ 'Technical Issues Liners' ]
          }
        },

        noClearGeneral: {
          type: "object",
          description: "When changing genre rotations or playlists, tracks in the queue will be removed EXCEPT those in this category.",
          additionalProperties: {
            type: "array",
            description: "Each property (RadioDJ main category) contains an array of subcategories to attribute. An empty array means to use all subcategories.",
            items: {
              type: "string"
            }
          },
          default: {
            "Sweepers": [],
            'Station IDs': [],
            "Jingles": [],
            "Promos": [],
            "Liners": [],
            "Commercials": [],
            "News": [],
            "PSAs": [],
            'Radio Shows': [],
            'Sports Openers': [],
            'Sports Liners': [],
            'Sports Closers': [],
            'Show Openers': [],
            'Show Returns': [],
            'Show Closers': [],
            "Segments": []
          }
        },

        noClearShow: {
          type: "object",
          description: "When starting a broadcast or prerecord, tracks in the queue will be removed EXCEPT those in this category.",
          additionalProperties: {
            type: "array",
            description: "Each property (RadioDJ main category) contains an array of subcategories to attribute. An empty array means to use all subcategories.",
            items: {
              type: "string"
            }
          },
          default: {
            "Sweepers": [],
            'Station IDs': [],
            "Jingles": [],
            "Promos": [],
            "Commercials": [],
            'Sports Openers': [],
            'Sports Liners': [],
            'Sports Closers': [],
            'Show Openers': [],
            'Show Returns': [],
            'Show Closers': []
          }
        },

        clearBreak: {
          type: "object",
          description: "When a broadcast host requests to return from a break, these tracks will be removed from the queue.",
          additionalProperties: {
            type: "array",
            description: "Each property (RadioDJ main category) contains an array of subcategories to attribute. An empty array means to use all subcategories.",
            items: {
              type: "string"
            }
          },
          default: {
            "PSAs": [],
            'Sports Music': [ 'Halftime and Break Music' ]
          }
        },

        noMeta: {
          type: "object",
          description: "Tracks in this category will have alternate meta displayed in now playing info instead of its own track info when playing. In addition, the system determines broadcasts and prerecords as on the air when no more noMeta tracks are in the queue.",
          additionalProperties: {
            type: "array",
            description: "Each property (RadioDJ main category) contains an array of subcategories to attribute. An empty array means to use all subcategories.",
            items: {
              type: "string"
            }
          },
          default: {
            "Jingles": [],
            'Station IDs': [],
            "PSAs": [],
            "Liners": [],
            "Sweepers": [],
            "Promos": [],
            'Sports Music': [],
            'Show Returns': [],
            'Sports Liners': [],
            "Commercials": []
          }
        },

        noFade: {
          type: "object",
          description: "An hourly CRON will run and set the fade on these tracks to 0, disabling all fading / crossfading on those tracks.",
          additionalProperties: {
            type: "array",
            description: "Each property (RadioDJ main category) contains an array of subcategories to attribute. An empty array means to use all subcategories.",
            items: {
              type: "string"
            }
          },
          default: {
            'Station IDs': [],
            "Promos": [],
            "PSAs": [],
            "Commercials": []
          }
        },
      },
      // Disallow removal of system categories by marking them required
      required: [ `music`, `adds`, `IDs`, `PSAs`, `sweepers`, `underwritings`, `liners`, `requestLiners`, `promos`, `halftime`, `technicalIssues`, `noClearGeneral`, `noClearShow`, `clearBreak`, `noMeta`, `noFade` ],

      // Additional categories
      additionalProperties: {
        type: "object",
        description: "Each property's key is the name of a RadioDJ main category.",
        additionalProperties: {
          type: "array",
          description: "Each property contains an array of subcategories to attribute. An empty array means to use all subcategories.",
          items: {
            type: "string"
          }
        }
      }
    },

    sports: {
      type: 'array',
      description: "An array of sports that have been configured for use in sports broadcasts. The RadioDJ categories of Sports Openers, Sports Liners, and Sports Closers must have a subcategory with each of these sports, and appropriate tracks in those subcategories.",
      items: {
        type: 'string',
        description: "Name of a sport as defined in subcategories for Sports Openers, Sports Liners, and Sports Closers RadioDJ categories."
      },
      default: [
        `Men's Basketball`,
        `Women's Basketball`,
        `Men's Baseball`,
        `Women's Softball`,
        `Men's Soccer`,
        `Women's Soccer`,
        `Men's Tennis`,
        `Women's Tennis`,
        `Men's Volleyball`,
        `Women's Volleyball`,
        `Men's Football`,
        `Women's Football`
      ]
    },

    meta: {
      type: "object",
      additionalProperties: false,
      description: "Settings pertaining to metadata / now playing information.",
      properties: {

        clearTime: {
          type: 'number',
          minimum: 1,
          description: "When a live DJ logs a manual track, it will be displayed for (up to) this many minutes in metadata before cleared automatically.",
          default: 10
        },

        alt: {
          type: "object",
          additionalProperties: false,
          description: "Alternate metadata to display when a noMeta category track is playing, depending on the system state.",
          properties: {
            automation: {
              type: 'string',
              default: "We'll get back to the music shortly...",
              description: "Alt metadata to display when a noMeta track is playing during default automation."
            },
            playlist: {
              type: 'string',
              default: "We'll get back to the playlist shortly...",
              description: "Alt metadata to display when a noMeta track is playing during a playlist."
            },
            genre: {
              type: 'string',
              default: "We'll get back to the music shortly...",
              description: "Alt metadata to display when a noMeta track is playing during a genre rotation."
            },
            live: {
              type: 'string',
              default: "We'll get back to the show shortly...",
              description: "Alt metadata to display when a noMeta track is playing during a live show."
            },
            prerecord: {
              type: 'string',
              default: "We'll get back to the show shortly...",
              description: "Alt metadata to display when a noMeta track is playing during a prerecorded show playlist."
            },
            remote: {
              type: 'string',
              default: "We'll get back to the broadcast shortly...",
              description: "Alt metadata to display when a noMeta track is playing during a remote broadcast."
            },
            sports: {
              type: 'string',
              default: "We'll get back to sports coverage shortly...",
              description: "Alt metadata to display when a noMeta track is playing during a sports broadcast."
            }
          },
          required: [ "automation", "playlist", "genre", "live", "prerecord", "remote", "sports" ]
        },

        prefix: {
          type: "object",
          additionalProperties: false,
          description: "Text to prepend to the beginning of now playing information depending on programming. Please pay attention to which line is indicated the text will display. Note: Spaces are NOT automatically added; add a space at the end of the prefix if you want one.",
          properties: {
            automation: {
              type: 'string',
              default: "Playing: ",
              description: "Prefix to use when playing a track during automation, genre, or playlist, on line 1 of metadata. It will be proceeded by the Artist - Title of the track."
            },
            genre: {
              type: 'string',
              default: "Genre: ",
              description: "Prefix to use on line 2 when in a genre rotation. Will be proceeded by the name of the genre rotation event."
            },
            playlist: {
              type: 'string',
              default: "Playlist: ",
              description: "Prefix to use on line 2 when playing a playlist. Will be proceeded by the name of the playlist event."
            },
            request: {
              type: 'string',
              default: "Requested by ",
              description: "When a requested track is playing, this prefix will be used on line 2 followed by the name of the person who requested the track."
            },
            pendLive: {
              type: 'string',
              default: "Coming Up: ",
              description: "Prefix to use on line 2 when a live show is about to start. Will be proceeded by DJ handle(s) - show name."
            },
            pendPrerecord: {
              type: 'string',
              default: "Coming Up: ",
              description: "Prefix to use on line 2 when a prerecord is about to start. Will be proceeded by DJ handle(s) - show name."
            },
            pendRemote: {
              type: 'string',
              default: "Coming Up: ",
              description: "Prefix to use on line 2 when a remote broadcast is about to start. Will be proceeded by DJ handle(s) - show name."
            },
            pendSports: {
              type: 'string',
              default: "Coming Up: Raider Sports - ",
              description: "Prefix to use on line 2 when a sports broadcast is about to start. Will be proceeded by the name of the sport."
            },
            prerecord: {
              type: 'string',
              default: "Airing: ",
              description: "Prefix to use on line 1 when a prerecorded show is airing. Will be proceeded by DJ Handle(s) - Show Name."
            },
            live: {
              type: 'string',
              default: "Live: ",
              description: "Prefix to use on line 1 when a live show is airing. Will be proceeded by DJ Handle(s) - Show Name."
            },
            remote: {
              type: 'string',
              default: "Broadcasting: ",
              description: "Prefix to use on line 1 when a remote broadcast is airing. Will be proceeded by DJ Handle(s) - Show Name."
            },
            sports: {
              type: 'string',
              default: "Live Raider Sports Coverage: ",
              description: "Prefix to use on line 1 when a sports broadcast is airing. Will be proceeded by the name of the sport."
            },
            playing: {
              type: 'string',
              default: "Playing: ",
              description: "Prefix to use on line 2 when a track is playing in radioDJ during a live, remote, sports, or prerecorded show. Will be proceeded by the artist - title of the track."
            },
          },
          required: [ "automation", "genre", "playlist", "request", "pendLive", "pendPrerecord", "pendRemote", "pendSports", "prerecord", "live", "remote", "sports", "playing" ]
        }

      },
      required: [ "clearTime", "alt", "prefix" ]
    },

    /*
         * Configuration format
         *
         * Each break is configured as a property in the breaks object as follows, based on an hourly clock wheel:
         * minuteNumberOfTheHour: [array of option objects] (for example, 0: [] will execute at around the top of every hour... 20: [] will execute at around :20 past every hour.
         * NOTE: A 0 (top of the hour) break is REQUIRED by the FCC and by this application. You must have an entry for a 0 break in the breaks configuration.
         *
         * Each break contains an array of option objects (0: [array of option objects]). Here are the options you can use:
         *
         * // This adds an info log entry under automation.
         * {task: "log", event: "What to log"}
         *
         * // This queues up to (quantity) number of requested tracks, and adds a request liner (categories.requestLiners) at the beginning (if any requests were queued).
         * {task: "queueRequests", quantity: 1}
         *
         * // Queues (quantity) number of tracks from (category) as configured in the categories section. If rules is true, tracks will be checked against playlist rotation rules.
         * {task: "queue", category: "categoryName (from the categories configuration)", quantity: 1, rules: true}
         *
         * // If any underwritings etc were removed from the queue due to duplicates, they get stored in memory. This re-queues them. It is advised to have this in every break.
         * {task: "queueDuplicates"}
         *
         * NOTE: everything is executed in REVERSE (items from the end of the array happen before the items in the beginning). But this works out because that way,
         * queued tracks end up in the order you specified. For example, if you put PSAs before an ID in the array, the PSAs will be above the IDs in RadioDJ, and will play first.
         *
         * Example:
         *
         * // The "20" means this break will queue around minute 20 of every hour
         * 20: [
         *         {task: "queue", category: "PSAs", quantity: 2}, // This queues 2 tracks that fall within the configured categories.PSAs tracks
         *         {task: "queueDuplicates"}, // This adds any underwritings etc that were previously removed from the queue due to duplicates
         *         {task: "queue", category: "sweepers", quantity: 1}, // This queues 1 sweeper (track configured in categories.sweepers)
         *         {task: "queueRequests", quantity: 3} // This queues up to 3 requested tracks, and adds a request liner (categories.requestLiners) at the beginning.
         *         {task: "queueUnderwritings", quantity: 2} // Queue up to quantity number of scheduled underwritings. Quantity may be ignored if there are more underwritings way behind schedule.
         *     ],
         *
         * // This break and set of options will queue at around :40 past every hour. We won't give another array of options example as it is redundant.
         * 40: [...]
         */

    /*
       * How Breaks Work (automation, playlists, genres, and prerecords)
       *
       * Breaks do NOT queue exactly at the configured minute every hour. Instead, the system uses algorithms / logic to determine when to queue them.
       * The primary goal is to queue breaks in such a way they are as on-time as possible, even if they have to queue a little early/late.
       * The secondary goal is to avoid having multiple breaks getting queued back to back.
       * NOTE: With the exception of the 0 break, which is never skipped... breaks may be skipped if necessary to prevent duplicate break queuing.
       *
       * Logic chart for determining when to queue breaks:
       *
       * For each configured break, checked every second:
       *
       * Current minute past the hour is < scheduled break minute, OR the break we are checking for is the 0 break (top of hour breaks should never be skipped).
       *     Yes v     No > exit / do not queue; if this happens and the break was never queued for this hour, it is skipped until the next hour.
       * Previous break was queued >= breakCheck (in configuration) minutes ago (0 break always uses 10 minutes regardless of breakCheck, and is compared to the previous 0 break only)
       *     Yes v     No > exit / do not queue at this time.
       * Current playing track remaining time is < breakCheck minutes (0 break always uses 10 minutes regardless of breakCheck)
       *     Yes v     No > exit / do not queue at this time.
       * Current playing track will finish after the scheduled break time
       *     No v      Yes > queue the break and exit. Break will air after the current track is finished. In this case, the break usually airs a little past scheduled time.
       * Current track will finish before scheduled break, and next track will finish after. But between being late and being early, break would be more late than it would early.
       *     No v      Yes > queue the break and exit. Break will air after the current track is finished and before the next one... a little early compared to its scheduled time.
       * Exit (do not queue the break at this time)
       *
       */

    /*
       * How Breaks Work (live shows, remotes, and sports broadcasts)
       *
       * Breaks for shows/remotes/sports broadcasts are configured in "specialBreaks"; "breaks" is only for during automation/genre/playlist/prerecord.
       *
       */
    breaks: {
      type: "object",
      description: "An hourly clockwheel defining breaks to take during automation and when. The key for every property in the object must be a number indicating the minute of the hour the break is to be executed. The value is an array of tasks to execute for that break.",
      propertyNames: {
        format: "number",
        minimum: 0,
        maximum: 59
      },
      default: {
        0: [
          { task: 'log', event: 'Queued :00 top of the hour ID break.' },
          { task: 'queue', category: 'IDs', quantity: 1 }
        ],
      },
      required: [ "0" ],
      additionalProperties: {
        type: "array",
        description: "Array of tasks to execute for this break. They will be executed in REVERSE order, which because track queuing is done at the top, tracks will end up playing in the order specified in this array.",
        items: {
          type: "object",
          additionalProperties: false,
          description: "A task to execute for this break.",
          oneOf: breakTaskSchema
        }
      }
    },

    specialBreaks: {
      type: "object",
      additionalProperties: false,
      description: "Special rules for non-automation breaks.",
      properties: {

        automation: {
          type: "object",
          additionalProperties: false,
          description: "Special non-clockwheel breaks during automation.",
          properties: {
            during: {
              type: "array",
              description: "During automation_break (when a DJ switches show and the system awaits the next DJ), these tasks will indefinitely execute when the queue is empty until the next DJ signs on or automation_break times out.",
              items: breakTaskSchema,
              default: [
                { task: 'queue', category: 'PSAs', quantity: 1 }
              ]
            }
          },
          required: [ "during" ]
        },

        live: {
          type: "object",
          additionalProperties: false,
          description: "Special non-clockwheel breaks during live shows. Note: Do not include show openers, returns, closers, nor station IDs, in this configuration; those are queued automatically.",
          properties: {
            start: {
              type: "array",
              description: "When a DJ is starting a live show broadcast, after all tracks not in the noClearShow category are removed, these tasks will be executed.",
              items: breakTaskSchema,
              default: [
                { task: 'queueUnderwritings', quantity: 1 }
              ]
            },
            before: {
              type: "array",
              description: "When a DJ is starting a break, these tasks will be executed.",
              items: breakTaskSchema,
              default: [
                { task: 'queueDuplicates' },
                { task: 'queueUnderwritings', quantity: 2 }
              ]
            },
            during: {
              type: "array",
              description: "When a DJ is in a break, these tasks will be executed indefinitely whenever the RadioDJ queue is empty until the DJ returns from break.",
              items: breakTaskSchema,
              default: [
                { task: 'queue', category: 'PSAs', quantity: 1 }
              ]
            },

            // TODO: Continue here
          },
          required: [ "start", "before", "during" ]
        }
      },
      required: [ "automation", "live" ]
    }
  }
});


// Create a config factory store; we are not using easy-config-store directly because it does not have a deleteProperty handler.
const config = (() => {
  let defaultCfg
  let saveConfigFunc
  const rawConfig = {}
  // eslint-disable-next-line prefer-const
  let config
  let timer

  const handle = {
    get: function (oTarget, sKey) {
      const result = oTarget[ sKey ]
      return result
    },
    set: function (oTarget, sKey, vValue) {
      if (vValue && typeof vValue === 'object') {
        proxyObject(vValue, [])
        vValue = new Proxy(vValue, handle)
      } else {
      }
      oTarget[ sKey ] = vValue
      saveConfigFunc(config)
      return true
    },
    deleteProperty: function (oTarget, sKey) {
      if (sKey in oTarget) {
        delete oTarget[ sKey ]
        saveConfigFunc(config)
        return true
      }
      return false
    }
  }

  config = new Proxy(rawConfig, handle)

  Object.defineProperties(rawConfig, {
    cfgClear: {
      value: () => {
        for (const k in config) {
          delete config[ k ]
        }
      }
    },
    cfgReset: {
      value: () => {
        for (const k in config) {
          delete config[ k ]
        }
        const cfg = Object.assign({}, defaultCfg)
        for (const k in cfg) {
          config[ k ] = cfg[ k ]
        }
      }
    },
    setOptions: {
      value: (cfg, onSaveCallback) => {
        if (onSaveCallback) {
          saveConfigFunc = onSaveCallback
        }
        defaultCfg = Object.assign({}, cfg)
        for (const k in cfg) {
          config[ k ] = cfg[ k ]
        }
      }
    },
    cfgUseFile: {
      value: (cfgPath) => {
        const fs = require('fs')
        if (!fs.existsSync(cfgPath)) {
          fs.writeFileSync(cfgPath, '{}', 'utf-8')
        }
        const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'))
        config.setOptions(cfg, (cfg) => {
          clearTimeout(timer)
          timer = setTimeout(() => {
            fs.writeFileSync(cfgPath, JSON.stringify(cfg), 'utf-8')
          }, 300)
        })
      }
    },
    cfgUseLocalStorage: {
      value: (key) => {
        const cfg = JSON.parse(localStorage[ key ])
        config.setOptions(cfg, (cfg) => {
          clearTimeout(timer)
          timer = setTimeout(() => {
            localStorage[ key ] = JSON.stringify(cfg)
          }, 300)
        })
      }
    },
    cfgUseMemory: {
      value: () => {
        config.setOptions({}, () => {
        })
      }
    }
  })

  function proxyObject (obj, proxys) {
    if (proxys.includes(obj)) {
      return
    }
    proxys.push(obj)
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        const v = obj[ k ]
        if (v && typeof v === 'object') {
          proxyObject(v, proxys)
          obj[ k ] = new Proxy(v, handle)
        } else {
        }
      }
    }
  }

  function build () {
    if (typeof (localStorage) === 'object') {
      config.cfgUseLocalStorage('easy-config-store')
    } else if (typeof (require('os')) === 'object') {
      const os = require('os')
      const path = require('path')
      config.cfgUseFile(path.join(os.tmpdir(), 'easy-config-store.cfg'))
    } else {
      config.cfgUseMemory()
    }
  }

  build()

  return config
})()

/*
 * WARNING: Changing values in the defaultConfig will not work unless it is a new configuration parameter!
 * Edit config.cfg instead, or use the config/* controllers in the HTTP API.
 */

var defaultConfig = {

  /*
     * BASIC CONFIGURATION
     */

  website: 'https://wwsu1069.org', // WWSU website URL

  stream: 'http://54.39.145.182:8000', // URL to the internet stream server for WWSU.

  hostSecret: '', // A random secret key used for generating hashes for public hosts / web mobile visitors. CHANGING THIS WILL INVALIDATE ACTIVE DISCIPLINE.

  // Used for oneSignal push notifications
  onesignal: {
    rest: ``,
    app: ``
  },

  // Used for Darksky weather API
  // DEPRECATED; TODO: remove
  darksky: {
    api: ``,
    position: {
      latitude: 39.7846,
      longitude: -84.0583
    }
  },

  // Climacell weather API
  climacell: {
    api: ``,
    position: {
      latitude: 39.7846,
      longitude: -84.0583
    },
    unitSystem: 'us'
  },

  startOfSemester: moment('2019-01-14 00:00:00').toISOString(true),

  /*
     * TRACK CATEGORIES AND META
     */

  /*
     * Configuration for the location of various tracks in RadioDJ. Each configuration follows this format:
     * name: {
     *          "main category name in RadioDJ": ["array", "of", "sub categories", "inside", "main category" "from RadioDJ"],
     *          "another main category in RadioDJ": [] (Empty array signifies use all subcategories in the main category)
     *          ...
     *       }
     *
     * CATEGORY NAMES MUST BE ALPHANUMERIC (no spaces nor symbols)!
     * NOTE: Any configured categories or subcategories not found will be ignored.
     * NOTE2: Whenever something else in this configuration files mentions "category", it refers to the categories configured here.
     *        For example, if an "IDs" category is configured here, you might specify "IDs" as the category of station IDs to queue somewhere else in this config file.
     */
  categories: {

    // Restrict removal of the provided category keys by the config system.
    _doNotRemove: [ `music`, `adds`, `IDs`, `PSAs`, `sweepers`, `underwritings`, `liners`, `requestLiners`, `promos`, `halftime`, `technicalIssues`, `noClearGeneral`, `noClearShow`, `clearBreak`, `noMeta`, `noFade` ],

    /*
         * REQUIRED CATEGORIES
         * The category objects below this line must not be removed / renamed; they are required by the server. Doing so will break the server!
         * You may, however, edit what is inside each of the category objects below to specify which RadioDJ categories/subcategories apply.
         */

    // All the category / subcategory pairs containing automation system music. This should INCLUDE Top Adds (but is up to Music/Program Director).
    // This is also used by the request system; all tracks in this config can be requested... other tracks cannot.
    music: {
      Music: [],
      'Top Adds': []
    },

    // Categories and subcategories containing Top Adds
    // DEFINITION: Recent music added to the system for high promotion.
    adds: {
      'Top Adds': []
    },

    // Legal Station IDs
    // DEFINITION: Required FCC ID at the top of every hour that includes call sign, frequency, and coverage area
    IDs: {
      'Station IDs': [ 'Standard IDs' ]
    },

    // Public Service Announcements
    // DEFINITION: A non-profit "commercial" that promotes a cause, organization, or social issue.
    PSAs: {
      PSAs: []
    },

    // Station Sweepers
    // DEFINITION: Fun audio clips, generally 15-30 seconds, identifying the station, played as defined in break configuration.
    sweepers: {
      Sweepers: [ 'Break Sweepers' ]
    },

    // Station underwritings and commercials
    // DEFINITION: A promotional audio clip usually paid for by the organization / company. Used in the underwriting queuing system.
    underwritings: {
      Commercials: []
    },

    // Station Liners
    // DEFINITION: Short (usually <6 seconds) station identification that plays in between music tracks during non-break times in automation.
    // NOTE: When a break is queued, any liners in the queue will be removed; it would be unprofessional for a liner to play right before or after a break.
    liners: {
      Liners: [ 'Standard Liners' ]
    },

    // Request liners
    // DEFINITION: Short (usually <6 seconds) audio clips that play before the system plays requested tracks (if in automation).
    requestLiners: {
      Liners: [ 'Request Liners' ]
    },

    // radio show promos
    // DEFINITION: An audio clip (usually 30-60 seconds) promoting a radio show or broadcast, played as defined in break configuration.
    promos: {
      Promos: [ 'Radio Show Promos' ]
    },

    // Music used for sports haltime and other extended sports breaks
    halftime: {
      'Sports Music': [ 'Halftime and Break Music' ]
    },

    // Liners played when the system is sent to break because of a technical issue (remote broadcasts)
    technicalIssues: {
      Liners: [ 'Technical Issues Liners' ]
    },

    // When the system changes to a new playlist or genre, all tracks will be removed from the current queue EXCEPT tracks that are in these defined categories / subcategories.
    noClearGeneral: {
      Sweepers: [],
      'Station IDs': [],
      Jingles: [],
      Promos: [],
      Liners: [],
      Commercials: [],
      News: [],
      PSAs: [],
      'Radio Shows': [],
      'Sports Openers': [],
      'Sports Liners': [],
      'Sports Closers': [],
      'Show Openers': [],
      'Show Returns': [],
      'Show Closers': [],
      Segments: []
    },

    // When someone starts a show/broadcast, all tracks in the queue will be removed EXCEPT tracks in these categories / subcategories.
    noClearShow: {
      Sweepers: [],
      'Station IDs': [],
      Jingles: [],
      Promos: [],
      Commercials: [],
      'Sports Openers': [],
      'Sports Liners': [],
      'Sports Closers': [],
      'Show Openers': [],
      'Show Returns': [],
      'Show Closers': []
    },

    // When a DJ or producer requests to exit break, all tracks in these defined categories and subcategories will be removed from the queue
    clearBreak: {
      PSAs: [],
      'Sports Music': [ 'Halftime and Break Music' ]
    },

    // Hide Meta Data for these categories, and instead display the corresponding meta.alt metadata. See meta.alt below.
    // NOTE: This also determines when the system determines when someone has gone on the air; the first track not existing in this category is deemed when someone is on
    noMeta: {
      Jingles: [],
      'Station IDs': [],
      PSAs: [],
      Liners: [],
      Sweepers: [],
      Promos: [],
      'Sports Music': [],
      'Show Returns': [],
      'Sports Liners': [],
      Commercials: []
    },

    // CRON will routinely check tracks in the specified categories. If there is a set fade in or fade out on these tracks, the system will reset these to zero (eg. no fading).
    noFade: {
      'Station IDs': [],
      Promos: [],
      PSAs: [],
      Commercials: []
    }

    /*
         * OPTIONAL CATEGORIES
         * The category objects below this line are optional. You may add, rename, or remove them as you wish.
         * However, if you remove or rename any, make sure you no longer reference them anywhere else in this config file!
         */
  },

  // sports is an array of sports configured in the system for broadcasting.
  // Each sport MUST BE a subcategory in the RadioDJ categories of Sports Openers, Sports Liners, and Sports Closers... and must contain at least one track in each...
  // in order to operate properly.
  // NOTE: DJ Controls code will need to be modified to include the new list of sports whenever this list is changed. It is advised not to change this except by a developer.
  sports: [
    `Men's Basketball`,
    `Women's Basketball`,
    `Men's Baseball`,
    `Women's Softball`,
    `Men's Soccer`,
    `Women's Soccer`,
    `Men's Tennis`,
    `Women's Tennis`,
    `Men's Volleyball`,
    `Women's Volleyball`,
    `Men's Football`,
    `Women's Football`
  ],

  meta: {
    // When a live DJ logs a manual track, it will be displayed for this many minutes in metadata before cleared automatically.
    clearTime: 10,

    // This is a collection of alternative text to use in metadata for various things
    alt: {
      // Meta text to use when playing a noMeta track in regular automation
      automation: `We'll get back to the music shortly...`,

      // Meta text to use when playing a noMeta track in playlist mode
      playlist: `We'll get back to the playlist shortly...`,

      // Meta text to use when playing a noMeta track in genre automation
      genre: `We'll get back to the music shortly...`,

      // Meta text to use when playing a noMeta track during a live show
      live: `We'll get back to the show shortly...`,

      // Meta text to use when playing a noMeta track during a prerecord
      prerecord: `We'll get back to the show shortly...`,

      // Meta text to use when playing a noMeta track, or when the remote stream disconnected, during a remote broadcast
      remote: `We'll get back to the broadcast shortly...`,

      // Meta text to use when playing something in automation during a sports broadcast (live or remote)
      sports: `We'll get back to the sports broadcast shortly...`
    },

    // This is a collection of prefixes to add to metadata for various types of programming.
    // NOTE: If you do not add a space at the end of the string, no space will be added automatically!
    prefix: {

      // During automation, this prefix will appear before the currently playing track on line 1 of metadata.
      automation: `Playing: `,

      // During genre, this will appear before the genre currently airing on line 2 of metadata.
      genre: `Genre: `,

      // During a playlist, this will appear before the playlist currently airing on line 2 of metadata
      playlist: `Playlist: `,

      // When playing a track request in automation, genre, or playlist... this will appear before the name of the person requesting the track on line 2 of metadata.
      request: `Requested By: `,

      // When a live show is about to begin, this will appear before the host - show on line 2 of metadata.
      pendLive: `Coming Up: `,

      // When a prerecorded show is about to begin, this will appear before the prerecord name on line 2 of metadata.
      pendPrerecord: `Coming Up: `,

      // When a remote broadcast is about to begin, this will appear before the host - show on line 2 of metadata.
      pendRemote: `Coming Up: `,

      // When a sports broadcast is about to begin, this will appear before the sport on line 2 of metadata.
      pendSports: `Coming Up: Raider Sports - `,

      // During a prerecorded show, this will appear before the name of the prerecord on line 1 of metadata.
      prerecord: `On the Air: `,

      // During a live show, this will appear before the host - show on line 1 of metadata.
      live: `On the Air: `,

      // During a remote broadcast, this will appear before the host - show on line 1 of metadata
      remote: `Broadcasting: `,

      // During a sports broadcast, this will appear before the sport being aired on line 1 of metadata
      sports: `Raider Sports: `,

      // In a live, remote, sports, or prerecorded show... this will appear before the track name on line 2 of metadata when something is being played
      playing: `Playing: `

    }
  },

  /*
     * BREAKS
     */

  /*
     * Configuration format
     *
     * Each break is configured as follows, based on an hourly clock wheel:
     * minuteNumber: [array of option objects] (for example, 0: [] will execute at around the top of every hour... 20: [] will execute at around :20 past every hour.
     * NOTE: A 0 (top of the hour) break is REQUIRED by the FCC and by this application. You must have an entry for a 0 break in the breaks configuration.
     *
     * Each break contains an array of option objects (0: [array of option objects]). Here are the options you can use:
     *
     * // This adds an info log entry under automation.
     * {task: "log", event: "What to log"}
     *
     * // This queues up to (quantity) number of requested tracks, and adds a request liner (categories.requestLiners) at the beginning (if any requests were queued).
     * {task: "queueRequests", quantity: 1}
     *
     * // Queues (quantity) number of tracks from (category) as configured in the categories section. If rules is true, tracks will be checked against playlist rotation rules.
     * {task: "queue", category: "categoryName (from the categories configuration)", quantity: 1, rules: true}
     *
     * // If any underwritings etc were removed from the queue due to duplicates, they get stored in memory. This re-queues them. It is advised to have this in every break.
     * {task: "queueDuplicates"}
     *
     * NOTE: everything is executed in REVERSE (items from the end of the array happen before the items in the beginning). But this works out because that way,
     * queued tracks end up in the order you specified. For example, if you put PSAs before an ID in the array, the PSAs will be above the IDs in RadioDJ, and will play first.
     *
     * Example:
     *
     * // The "20" means this break will queue around minute 20 of every hour
     * 20: [
     *         {task: "queue", category: "PSAs", quantity: 2}, // This queues 2 tracks that fall within the configured categories.PSAs tracks
     *         {task: "queueDuplicates"}, // This adds any underwritings etc that were previously removed from the queue due to duplicates
     *         {task: "queue", category: "sweepers", quantity: 1}, // This queues 1 sweeper (track configured in categories.sweepers)
     *         {task: "queueRequests", quantity: 3} // This queues up to 3 requested tracks, and adds a request liner (categories.requestLiners) at the beginning.
     *         {task: "queueUnderwritings", quantity: 2} // Queue up to quantity number of scheduled underwritings. Quantity may be ignored if there are more underwritings way behind schedule.
     *     ],
     *
     * // This break and set of options will queue at around :40 past every hour. We won't give another array of options example as it is redundant.
     * 40: [...]
     */

  /*
     * How Breaks Work (automation, playlists, genres, and prerecords)
     *
     * Breaks do NOT queue exactly at the configured minute every hour. Instead, the system uses intelligent guessing to determine when to queue them.
     * The primary goal is to queue breaks in such a way they are as on-time as possible, even if they have to queue a little early/late.
     * The secondary goal is to avoid having multiple breaks getting queued back to back.
     * NOTE: With the exception of the 0 break, which is never skipped... breaks may be skipped if necessary to prevent duplicate break queuing.
     *
     * Logic chart for determining when to queue breaks:
     *
     * For each configured break, checked every second by the cron.js "checks" CRON:
     *
     * Current minute past the hour is < scheduled break minute, OR the break we are checking for is the 0 break (top of hour breaks should never be skipped).
     *     Yes v     No > exit / do not queue; if this happens and the break was never queued for this hour, it is skipped until the next hour.
     * Previous break was queued >= breakCheck (in configuration) minutes ago (0 break always uses 10 minutes regardless of breakCheck, and is compared to the previous 0 break only)
     *     Yes v     No > exit / do not queue at this time.
     * Current playing track remaining time is < breakCheck minutes (0 break always uses 10 minutes regardless of breakCheck)
     *     Yes v     No > exit / do not queue at this time.
     * Current playing track will finish after the scheduled break time
     *     No v      Yes > queue the break and exit. Break will air after the current track is finished. In this case, the break usually airs a little past scheduled time.
     * Current track will finish before scheduled break, and next track will finish after. But between being late and being early, break would be more late than it would early.
     *     No v      Yes > queue the break and exit. Break will air after the current track is finished and before the next one... a little early compared to its scheduled time.
     * Exit (do not queue the break at this time)
     *
     */

  /*
     * How Breaks Work (live shows, remotes, and sports broadcasts)
     *
     * Breaks for shows/remotes/sports broadcasts are configured in "specialBreaks"; "breaks" is only for during automation.
     *
     */
  breaks: {
    // This break will be triggered around the :00 of every hour. You MUST ALWAYS have a 0 break.
    0: [
      { task: 'log', event: 'Queued :00 top of the hour ID break.' },
      { task: 'queue', category: 'PSAs', quantity: 1 },
      { task: 'queueDuplicates' },
      { task: 'queueUnderwritings', quantity: 1 },
      { task: 'queue', category: 'promos', quantity: 1 },
      { task: 'queue', category: 'IDs', quantity: 1 },
      { task: 'queueRequests', quantity: 3 }
    ],

    // This break will be triggered around the :20 of every hour.
    20: [
      { task: 'log', event: 'Queued :20 PSA break.' },
      { task: 'queue', category: 'PSAs', quantity: 1 },
      { task: 'queueDuplicates' },
      { task: 'queueUnderwritings', quantity: 2 },
      { task: 'queue', category: 'sweepers', quantity: 1 },
      { task: 'queueRequests', quantity: 3 }
    ],

    // This break will be triggered around the :40 of every hour.
    40: [
      { task: 'log', event: 'Queued :40 PSA break.' },
      { task: 'queue', category: 'PSAs', quantity: 1 },
      { task: 'queueDuplicates' },
      { task: 'queueUnderwritings', quantity: 2 },
      { task: 'queue', category: 'sweepers', quantity: 1 },
      { task: 'queueRequests', quantity: 3 }
    ]
  },

  /*
     * This object is for configuring the breaks during broadcasts. In each array, you will put objects specifying what should be executed / queued.
     * The objects follow the same format as in the "breaks" configuration, as follows:
     *
     * // This adds an info log entry under automation.
     * {task: "log", event: "What to log"}
     *
     * // This queues up to (quantity) number of requested tracks, and adds a request liner (categories.requestLiners) at the beginning (if any requests were queued).
     * // It is NOT recommended to queue / play requests during broadcast breaks; let the DJ control those through DJ Controls.
     * {task: "queueRequests", quantity: 1}
     *
     * // Queues (quantity) number of tracks from (category) as configured in the categories section. If rules is true, tracks will be checked against playlist rotation rules.
     * {task: "queue", category: "categoryName (from the categories configuration)", quantity: 1, rules: true}
     *
     * // If any underwritings etc were removed from the queue due to duplicates, they get stored in memory. This re-queues them. It is advised to have this in every break.
     * {task: "queueDuplicates"}
     *
     * NOTE: everything is executed in REVERSE (items from the end of the array happen before the items in the beginning). But this works out because that way,
     * queued tracks end up in the order you specified. For example, if you put PSAs before an ID in the array, the PSAs will be above the IDs in RadioDJ, and will play first.
     *
     */
  specialBreaks: {

    // Automation / during is executed when a DJ "Switches show" and goes to automation_break. It is repeatedly executed whenever the queue empties until either the
    // break times out, or another show begins.
    automation: {
      during: [
        { task: 'queue', category: 'PSAs', quantity: 1 }
      ]
    },

    // Breaks during live shows
    // Do not include show openers, returns, closers, nor station IDs, in this configuration; those are queued automatically.
    live: {

      // These are queued/executed just before a live show begins.
      start: [
        { task: 'queueUnderwritings', quantity: 1 }
      ],

      // These are queued/executed once, right when the break is started.
      before: [
        { task: 'queueDuplicates' },
        { task: 'queueUnderwritings', quantity: 2 }
      ],

      // These are executed/queued repeatedly every time RadioDJ's queue gets empty until the DJ returns from their break.
      during: [
        { task: 'queue', category: 'PSAs', quantity: 1 }
      ],

      // These are queued/executed when the DJ returns from their break.
      after: [
        { task: 'queue', category: 'sweepers', quantity: 1 }
      ],

      // These are queued/executed when the live show ends.
      end: [

      ]

    },

    // Breaks during remote broadcasts
    // Do not include show openers, returns, closers, nor station IDs, in this configuration; those are queued automatically.
    remote: {

      // These are queued/executed just before a remote broadcast begins.
      start: [
        { task: 'queueUnderwritings', quantity: 1 }
      ],

      // These are queued/executed once, right when the break is started.
      before: [
        { task: 'queueDuplicates' },
        { task: 'queueUnderwritings', quantity: 2 }
      ],

      // These are executed/queued repeatedly every time RadioDJ's queue gets empty until the DJ returns from their break.
      during: [
        { task: 'queue', category: 'PSAs', quantity: 1 }
      ],

      // These are queued/executed when the DJ returns from their break.
      after: [
        { task: 'queue', category: 'sweepers', quantity: 1 }
      ],

      // These are queued/executed after a remote broadcast ends.
      end: [
      ]

    },

    // Breaks during sports broadcasts (both live and remote)
    // Do not include sports openers, closers, returns, nor station IDs, in this configuration; those are queued automatically.
    sports: {

      // These are queued/executed just before a sports broadcast begins.
      start: [
      ],

      // These are queued/executed once, right when the break is started.
      before: [
        { task: 'queueDuplicates' },
        { task: 'queueUnderwritings', quantity: 2 }
      ],

      // During standard breaks, these are executed/queued repeatedly every time RadioDJ's queue gets empty until the producer returns from their break.
      during: [
        { task: 'queue', category: 'PSAs', quantity: 1 }
      ],

      // During extended breaks / halftime, these are executed/queued repeatedly every time RadioDJ's queue gets empty until the producer returns from their break.
      duringHalftime: [
        { task: 'queue', category: 'halftime', quantity: 1 }
      ],

      // These are queued/executed when the producer returns from their break.
      after: [
        { task: 'queue', category: 'sweepers', quantity: 1 }
      ],

      // These are queued/executed after a sports broadcast ends.
      end: [
      ]

    }
  },

  // When considering when to queue breaks, if a break was queued less than this many minutes ago, hold off on queuing any other breaks until this many minutes have passed since.
  // You MUST NOT have any intervals between breaks that are less than this. For example, if this is 10, and you have a break at 25 and another at 30 (5 minute difference), this will cause problems.
  // NOTE: The "0" break ignores this setting since it is required by the FCC. It has its own hard-coded check of 10 minutes that cannot be configured.
  breakCheck: 10,

  // A track from the defined "liners" categories will be queued during automation between music tracks during non-breaks.
  // Do not play a liner more often than once every defined number of minutes below.
  // NOTE: This clock is reset when a break is played so as to avoid playing a liner too close to a break.
  linerTime: 10,

  // This object of options regards checking for queues, and triggering errorChecks if a queue is deemed too long in order to fix that and get live shows / broadcasts on the air
  // sooner.
  // NOTE: these checks only run once; if, say, the queue condition satisfies, and later doesn't, errorCheck will not trigger. This is by design since hosts can add PSAs / more time.
  queueCorrection: {

    // If trying to begin a live show, and the total queue time is greater than this in seconds, skip currently playing track and try clearing necessary tracks from the queue again.
    live: (60 * 5),

    // If the amount of time between now and the first prerecord playlist track is greater than this many seconds, try clearing/skipping some tracks to get the prerecord on the air sooner.
    prerecord: (60 * 5),

    // If trying to begin a sports broadcast, if the total queue is greater than this many seconds, skip current track, clear necessary tracks to try and get sports on sooner.
    sports: 60,

    // When first returning from a break in a sports broadcast, if the queue is greater than this in seconds, clear out some tracks.
    sportsReturn: 30,

    // If trying to begin a remote broadcast, if the total queue is greater than this many seconds, skip current track, clear necessary tracks to try and get remote on sooner.
    remote: (60 * 5)
  },

  /*
     * STATUS CHECKS
     */

  // Configure this array with all RadioDJs that Node should use for programming.
  // {name: 'alphaname' ("radiodj-" prepends this), label: 'Friendly name' ("RadioDJ " will prepend this), rest: 'restURL', level: 1 (1=critical, 2=significant, 3=minor)}
  radiodjs: [
  ],

  // Array of display signs which should trip status alarms (level 3: minor issue) if they are not connected.
  // {name: 'alphaname' ("display-" prepends this), label: 'Friendly name' ("Display " will prepend this), level: 1 (1=critical, 2=significant, 3=minor), instances: 1 (number of display signs to expect to be connected)}
  // All other display signs will either give a status of 4 (online no-issue) if they are reported offline, or will not show up in the recipients table.
  displaysigns: [
    { name: 'public', label: 'Public', level: 3, instances: 2 }, // We have two display signs that show the public page
    { name: 'internal', label: 'Internal', level: 3, instances: 1 }
  ],

  // RadioDJ REST server configuration
  rest: {
    auth: '' // Enter the REST authentication password for RadioDJ here. Must be the same on all RadioDJ instances
  },

  // Object configuration regarding the track liking system

  songsliked: {

    // A song by the same IP can only be liked once every provided number of days. Use "0" to indicate a track may only ever be liked once per IP.
    limit: 7,

    // By how much should a track's priority be bumped in RadioDJ when it is liked? Negative numbers are supported.
    priorityBump: 2
  },

  /*
     * REQUESTS
     */

  // Options dealing with track requests
  requests: {

    dailyLimit: 10, // How many requests can be made per IP/client per day

    // By how much should the priority of tracks be bumped in RadioDJ when they are requested? Negative numbers are supported.
    priorityBump: 1
  },

  // Object of options pertaining to the Status system
  status: {

    // Object of options pertaining to the Music Library subsystem
    musicLibrary: {

      // Config relating to checks for RadioDJ tracks marked invalid because of not being able to play them
      verify: {

        // Music Library should go into minor issue status when this many tracks are detected as invalid.
        warn: 10,

        // Music Library should go into partial outage status when this many tracks are detected as invalid.
        error: 50,

        // Music library should go into critical status when this many tracks are detected as invalid.
        critical: 250
      }
    },

    // Object of options pertaining to the Server subsystem
    server: {

      // One minute CPU load options
      load1: {

        // When the one minute CPU load reaches this, trigger minor issue
        warn: 4,

        // When the one minute CPU load reaches this, trigger partial outage
        error: 8,

        // When the one minute CPU load reaches this, trigger serious outage
        critical: 16

      },

      // Five minute CPU load options
      load5: {

        // When the five minute CPU load reaches this, trigger minor issue
        warn: 3,

        // When the five minute CPU load reaches this, trigger partial outage
        error: 6,

        // When the five minute CPU load reaches this, trigger serious outage
        critical: 12

      },

      // 15 minute CPU load options
      load15: {

        // When the 15 minute CPU load reaches this, trigger minor issue
        warn: 2,

        // When the 15 minute CPU load reaches this, trigger partial outage
        error: 4,

        // When the 15 minute CPU load reaches this, trigger serious outage
        critical: 8

      },

      // Free memory options
      memory: {

        // If free RAM/memory is below this many bytes, trigger minor issue.
        warn: 512000000,

        // If free RAM/memory is below this many bytes, trigger partial outage.
        error: 256000000,

        // If free RAM/memory is below this many bytes, trigger serious outage.
        critical: 64000000
      }

    }
  },

  /*
     * PROFANITY FILTER FOR MESSAGES AND METADATA
     */

  profanity: [
    '5h1t',
    '5hit',
    'assfukka',
    'asshole',
    'asswhole',
    'b!tch',
    'b17ch',
    'b1tch',
    'ballbag',
    'ballsack',
    'beastiality',
    'bestiality',
    'bi+ch',
    'biatch',
    'bitch',
    'blow job',
    'blowjob',
    'boiolas',
    'boner',
    'bunny fucker',
    'butthole',
    'buttmuch',
    'buttplug',
    'carpet muncher',
    'chink',
    'cl1t',
    'clit',
    'cnut',
    'cock-sucker',
    'cockface',
    'cockhead',
    'cockmunch',
    'cocksuck',
    'cocksuka',
    'cocksukka',
    'cokmuncher',
    'coksucka',
    'cummer',
    'cumming',
    'cumshot',
    'cunilingus',
    'cunillingus',
    'cunnilingus',
    'cunt',
    'cyberfuc',
    'dickhead',
    'dildo',
    'dog-fucker',
    'doggin',
    'dogging',
    'donkeyribber',
    'doosh',
    'duche',
    'dyke',
    'ejaculate',
    'ejaculating',
    'ejaculation',
    'ejakulate',
    'f u c k',
    'fag',
    'fannyflaps',
    'fannyfucker',
    'fatass',
    'fcuk',
    'felching',
    'fellate',
    'fellatio',
    'flange',
    'fuck',
    'fudge packer',
    'fudgepacker',
    'fuk',
    'fux',
    'fux0r',
    'f_u_c_k',
    'gangbang',
    'gaylord',
    'gaysex',
    'goatse',
    'god-dam',
    'goddamn',
    'hardcoresex',
    'heshe',
    'homosex',
    'horniest',
    'horny',
    'hotsex',
    'jack-off',
    'jackoff',
    'jerk-off',
    'jism',
    'jiz',
    'jizm',
    'kawk',
    'kunilingus',
    'l3i+ch',
    'l3itch',
    'labia',
    'm0f0',
    'm0fo',
    'm45terbate',
    'ma5terb8',
    'ma5terbate',
    'master-bate',
    'masterb8',
    'masterbat*',
    'masterbat3',
    'masterbate',
    'masterbation',
    'masturbate',
    'mo-fo',
    'mof0',
    'mofo',
    'muthafecker',
    'muthafuckker',
    'mutherfucker',
    'n1gga',
    'n1gger',
    'nigg3r',
    'nigg4h',
    'nigga',
    'nigger',
    'nob jokey',
    'nobhead',
    'nobjocky',
    'nobjokey',
    'numbnuts',
    'nutsack',
    'pecker',
    'penis',
    'phonesex',
    'phuck',
    'phuk',
    'phuq',
    'pimpis',
    'piss',
    'prick',
    'pusse',
    'pussi',
    'pussies',
    'pussy',
    'rectum',
    'retard',
    'rimjaw',
    'rimming',
    's hit',
    'schlong',
    'scroat',
    'scrote',
    'scrotum',
    'semen',
    'sh!+',
    'sh!t',
    'sh1t',
    'shag',
    'shagger',
    'shaggin',
    'shagging',
    'shemale',
    'shi+',
    'shit',
    'skank',
    'slut',
    'sluts',
    'smegma',
    'spunk',
    's_h_i_t',
    't1tt1e5',
    't1tties',
    'teets',
    'testical',
    'testicle',
    'titfuck',
    'tits',
    'tittie5',
    'tittiefucker',
    'titties',
    'tw4t',
    'twat',
    'twunt',
    'vagina',
    'vulva',
    'w00se',
    'wang',
    'wanker',
    'wanky',
    'whore'
  ],

  /*
     * sails.helpers.sanitize (sanitize-html options)
     */

  sanitize: {
    allowedTags: [ 'h5', 'h6', 'blockquote', 'p', 'a', 'ul', 'ol',
      'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'u', 's', 'span' ],
    allowedAttributes: {
      a: [ 'href', 'name', 'target' ],
      span: [ 'style' ]
    },
    allowedStyles: {
      span: {
        // Match HEX and RGB
        color: [ /^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/ ]
      }
    },
    // Lots of these won't come up by default because we don't allow them
    selfClosing: [ 'br', 'hr', 'area', 'base', 'basefont', 'input', 'link', 'meta' ],
    // URL schemes we permit
    allowedSchemes: [ 'http', 'https' ],
    allowedSchemesByTag: {},
    allowedSchemesAppliedToAttributes: [ 'href', 'src', 'cite' ],
    allowProtocolRelative: true
  },

  /*
     * INTERNAL EMERGENCY ALERT SYSTEM
     */

  EAS: {
    // An array of county/zone objects to get weather alerts for from the NWS CAPS. {code: 'CTYCODE', name: 'Name of county'}
    NWSX: [
    ],

    // This object contains all of the NWS alerts we will process. Key is the alert event name from NWS, value is the hex color used for this alert.
    // Any alerts from NWS that contain an event name that does not exist in this object will not be processed and sent out.
    alerts: {
      '911 Telephone Outage': '#C0C0C0',
      'Administrative Message': '#FFFFFF',
      'Air Quality Alert': '#808080',
      'Air Stagnation Advisory': '#808080',
      'Arroyo and Small Stream Flood Advisory': '#00FF7F',
      'Ashfall Advisory': '#696969',
      'Ashfall Warning': '#A9A9A9',
      'Avalanche Advisory': '#CD853F',
      'Avalanche Warning': '#1E90FF',
      'Avalanche Watch': '#F4A460',
      'Blizzard Warning': '#FF4500',
      'Blizzard Watch': '#ADFF2F',
      'Blowing Dust Advisory': '#BDB76B',
      'Brisk Wind Advisory': '#D8BFD8',
      'Child Abduction Emergency': '#FFD700',
      'Civil Danger Warning': '#FFB6C1',
      'Civil Emergency Message': '#FFB6C1',
      'Coastal Flood Advisory': '#7CFC00',
      'Coastal Flood Warning': '#228B22',
      'Coastal Flood Watch': '#66CDAA',
      'Dense Fog Advisory': '#708090',
      'Dense Smoke Advisory': '#F0E68C',
      'Dust Storm Warning': '#FFE4C4',
      'Earthquake Warning': '#8B4513',
      'Evacuation - Immediate': '#7FFF00',
      'Excessive Heat Warning': '#C71585',
      'Excessive Heat Watch': '#800000',
      'Extreme Cold Warning': '#0000FF',
      'Extreme Cold Watch': '#0000FF',
      'Extreme Fire Danger': '#E9967A',
      'Extreme Wind Warning': '#FF8C00',
      'Fire Warning': '#A0522D',
      'Fire Weather Watch': '#FFDEAD',
      'Flash Flood Warning': '#8B0000',
      'Flash Flood Watch': '#2E8B57',
      'Flood Advisory': '#00FF7F',
      'Flood Warning': '#00FF00',
      'Flood Watch': '#2E8B57',
      'Freeze Warning': '#483D8B',
      'Freeze Watch': '#00FFFF',
      'Freezing Fog Advisory': '#008080',
      'Freezing Rain Advisory': '#DA70D6',
      'Freezing Spray Advisory': '#00BFFF',
      'Frost Advisory': '#6495ED',
      'Gale Warning': '#DDA0DD',
      'Gale Watch': '#FFC0CB',
      'Hard Freeze Warning': '#9400D3',
      'Hard Freeze Watch': '#4169E1',
      'Hazardous Materials Warning': '#4B0082',
      'Hazardous Seas Warning': '#D8BFD8',
      'Hazardous Seas Watch': '#483D8B',
      'Heat Advisory': '#FF7F50',
      'Heavy Freezing Spray Warning': '#00BFFF',
      'Heavy Freezing Spray Watch': '#BC8F8F',
      'High Surf Advisory': '#BA55D3',
      'High Surf Warning': '#228B22',
      'High Wind Warning': '#DAA520',
      'High Wind Watch': '#B8860B',
      'Hurricane Force Wind Warning': '#CD5C5C',
      'Hurricane Force Wind Watch': '#9932CC',
      'Hurricane Warning': '#DC143C',
      'Hurricane Watch': '#FF00FF',
      'Hydrologic Advisory': '#00FF7F',
      'Ice Storm Warning': '#8B008B',
      'Lake Effect Snow Advisory': '#48D1CC',
      'Lake Effect Snow Warning': '#008B8B',
      'Lake Effect Snow Watch': '#87CEFA',
      'Lake Wind Advisory': '#D2B48C',
      'Lakeshore Flood Advisory': '#7CFC00',
      'Lakeshore Flood Warning': '#228B22',
      'Lakeshore Flood Watch': '#66CDAA',
      'Law Enforcement Warning': '#C0C0C0',
      'Local Area Emergency': '#C0C0C0',
      'Low Water Advisory': '#A52A2A',
      'Nuclear Power Plant Warning': '#4B0082',
      'Radiological Hazard Warning': '#4B0082',
      'Red Flag Warning': '#FF1493',
      'Severe Thunderstorm Warning': '#FFA500',
      'Severe Thunderstorm Watch': '#DB7093',
      'Shelter In Place Warning': '#FA8072',
      'Small Craft Advisory': '#D8BFD8',
      'Small Craft Advisory For Hazardous Seas': '#D8BFD8',
      'Small Craft Advisory For Rough Bar': '#D8BFD8',
      'Small Craft Advisory For Winds': '#D8BFD8',
      'Small Stream Flood Advisory': '#00FF7F',
      'Special Marine Warning': '#FFA500',
      'Storm Warning': '#9400D3',
      'Storm Watch': '#FFE4B5',
      Test: '#F0FFFF',
      'Tornado Warning': '#FF0000',
      'Tornado Watch': '#FFFF00',
      'Tropical Storm Warning': '#B22222',
      'Tropical Storm Watch': '#F08080',
      'Tsunami Advisory': '#D2691E',
      'Tsunami Warning': '#FD6347',
      'Tsunami Watch': '#FF00FF',
      'Typhoon Warning': '#DC143C',
      'Typhoon Watch': '#FF00FF',
      'Urban and Small Stream Flood Advisory': '#00FF7F',
      'Volcano Warning': '#2F4F4F',
      'Wind Advisory': '#D2B48C',
      'Wind Chill Advisory': '#AFEEEE',
      'Wind Chill Warning': '#B0C4DE',
      'Wind Chill Watch': '#5F9EA0',
      'Winter Storm Warning': '#FF69B4',
      'Winter Storm Watch': '#4682B4',
      'Winter Weather Advisory': '#7B68EE'
    }
  },

  /*
     * OTHER SETTINGS
     */

  lofi: false, // If true, backend will skip the checks CRON. This will also disable some subsystems like metadata. Recommended only change by a developer.

  /*
     * !!! DO NOT MODIFY ANY CONFIGURATION BELOW THIS LINE (populated by the application automatically) !!!
     */

  // This is populated by bootstrap by taking all of the configuration from categories and finding subcategory IDs.
  subcats: {},
  // Populated by bootstrap via sports and getting subcategory IDs
  sportscats: {},
  // Populated by bootstrap via Show Openers, Show Returns, and Show Closers
  showcats: {},
  // Populated by bootstrap; contains randomly generated secrets to use for this process for token authentication
  secrets: {}

}
