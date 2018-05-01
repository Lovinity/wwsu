FORMAT: 4A
HOST: http://server.wwsu1069.org

# wwsu

The WWSU Radio Sails.js API application enables external / remote control of core WWSU functionality. Applications can be developed utilizing this API.

## User [/user]

### /user/auth [POST /user/auth]

A lot of API endpoints require a valid authorization in the form of a header. 
The key is "authorization", and the value is "Bearer (token)". 
Use the /user/auth endpoint to authenticate and get a token.
User accounts are issued by WWSU. They are not available on request.

+ Request (application/x-www-form-urlencoded)

    + Attributes

        + email: Email address of authenticating user. (string, required)
        + password: Password of authenticating user (string, required)

+ Response 200 (application/json)

        {
             "user": {
                 "email": "null@example.com",
                 "id": 0,
                  "createdAt": "2018-02-15T18:00:01.000Z",
                  "updatedAt": "2018-02-15T18:00:01.000Z"
              },
          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNTI1MTI5NTY3LCJleHAiOjE1MjUxMzA0Njd9.1QOmO3EzvkvMBSf5WohMFnCSYzCXxLBFAp-JUrUUGq0"
        }
    
+ Response 401 (application/json)

        {
            "err": "Email and password required."
        }
        
+ Response 401 (application/json)

        {
            "err": "Invalid Token!"
        }
        
## Directors [/directors]

Directors endpoints regard the directors of WWSU Radio.

### /directors/get [GET /directors/get]

Get one specific director of WWSU.

+ Request (application/x-www-form-urlencoded)

    + Attributes

        + username: Username of the director to fetch. (string, required)

+ Response 200 (application/json)

        {
            "George Carlin": { // Full name of the director
                "position": "General Manager", // Director's occupation with WWSU
                "present": false, // False = clocked out, True = clocked in
                "since": "2018-04-30T19:51:16.000Z" // Time at which present last changed
            }
        }

+ Response 404

### /directors/getall [GET /directors/getall]

Get all directors of WWSU. If the request is a web socket, the request will be subscribed to the directors event to receive changes to any of the directors.

+ Response 200 (application/json)

        {
            "George Carlin": { // Full name of the director
                "position": "General Manager", // Director's occupation with WWSU
                "present": false, // False = clocked out, True = clocked in
                "since": "2018-04-30T19:51:16.000Z" // Time at which present last changed
            },
            ...
        }
        
## Discipline [/discipline]

Discipline endpoints manage moderation of website and mobile app users.
**NOTE** All discipline endpoints require a valid token from /auth .

### /discipline/showban [POST /discipline/showban]

Bans the specified user until the currently live DJ/broadcast ends. Also mass deletes all website messages sent by the specified user.
**Requires /auth authorization**

+ Request (application/x-www-form-urlencoded)

    + Attributes

        + host: The unique ID of the user, issued by the WWSU system internally. (string, required)
        
+ Response 200
+ Response 500

### /discipline/dayban [POST /discipline/dayban]

Bans the specified user for 24 hours. Also mass deletes all website messages sent by the specified user.
**Requires /auth authorization**

+ Request (application/x-www-form-urlencoded)

    + Attributes

        + host: The unique ID of the user, issued by the WWSU system internally. (string, required)
        
+ Response 200
+ Response 500

### /discipline/permaban [POST /discipline/permaban]

Bans the specified user indefinitely. Also mass deletes all website messages sent by the specified user.
**Requires /auth authorization**

+ Request (application/x-www-form-urlencoded)

    + Attributes

        + host: The unique ID of the user, issued by the WWSU system internally. (string, required)
        
+ Response 200
+ Response 500
        
## Status [/status]

Status endpoints refer to the status of WWSU subsystems.

### /status/get [GET /status/get]

Get the status of WWSU sub-systems. If the request is a socket, the request will be subscribed to the status event to receive changes to statuses.

+ Response 200 (application/json)

        {
            "database": {
                "label": "Database", // Friendly name
                "status": 5, // 1 = critical issue, 2 = major issue, 3 = minor issue, 4 = offline, 5 = good
                "time": "2018-04-30T23:21:06.204Z" // Time at which the subsystem last had a good (5) status
            },
            ...
        }
        
## Meta [/meta]

Meta endpoints regard metadata, or what is currently playing / on the air.

### /meta/get [GET /meta/get]

Get the current meta. If request is a socket, will also be subscribed to the meta event, which will receive meta changes.

+ Response 200 (application/json)

        {
            state: 'unknown', // State of the WWSU system
            dj: '', // If someone is on the air, name of the host
            track: '', // Currently playing track either in automation or manually logged
            trackstamp: null, // Use moment.toISOString() when changing in changeMeta! If you directly store a moment instance here, database updating will fail
            topic: '', // If the DJ specified a show topic, this is the topic.
            stream: '', // Meta for the internet radio stream
            radiodj: '', // REST IP of the RadioDJ instance currently in control
            djcontrols: '', // Hostname of the computer in which has activated the most recent live/sports/remote broadcast via DJ Controls
            line1: '', // First line of meta for display signs
            line2: '', // Second line of meta for display signs
            percent: 0, // Integer or float between 0 and 100 indicating how far in the current track in automation we are, for display signs
            time: '', // Human readable date and time for display signs
            listeners: 0, // Number of current online listeners
            listenerpeak: 0, // Number of peak online listeners
            queueLength: 0, // Amount of audio queued in radioDJ in seconds (can be a float)
            breakneeded: false, // If the current DJ needs to take the FCC required top of the hour break, this will be true
            status: 4, // Overall system status: 1 = major outage, 2 = partial outage, 3 = minor issue, 4 = rebooting, 5 = operational
            webchat: true // Set to false to restrict the ability to send chat messages through the website
        },
