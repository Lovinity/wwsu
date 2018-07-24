/**
 * Songs.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'radiodj',
  attributes: {
      
        ID: {
            type: 'number',
            autoIncrement: true
        },

        path: {
            type: 'string'
        },

        enabled: {
            type: 'number'
        },

        date_added: {
            type: 'ref',
            columnType: 'datetime'
        },

        date_modified: {
            type: 'ref',
            columnType: 'datetime'
        },

        date_played: {
            type: 'ref',
            columnType: 'datetime'
        },

        artist_played: {
            type: 'ref',
            columnType: 'datetime'
        },

        album_played: {
            type: 'ref',
            columnType: 'datetime'
        },

        title_played: {
            type: 'ref',
            columnType: 'datetime'
        },

        count_played: {
            type: 'number'
        },

        play_limit: {
            type: 'number'
        },

        limit_action: {
            type: 'number'
        },

        start_date: {
            type: 'ref',
            columnType: 'datetime'
        },

        end_date: {
            type: 'ref',
            columnType: 'datetime'
        },

        startEvent: {
            type: 'number'
        },

        endEvent: {
            type: 'number'
        },

        song_type: {
            type: 'number'
        },

        id_subcat: {
            type: 'number'
        },

        id_genre: {
            type: 'number'
        },

        weight: {
            type: 'number'
        },

        duration: {
            type: 'number'
        },

        original_duration: {
            type: 'number'
        },

        cue_times: {
            type: 'string'
        },

        precise_cue: {
            type: 'number'
        },

        fade_type: {
            type: 'number'
        },

        start_type: {
            type: 'number'
        },

        end_type: {
            type: 'number'
        },

        mix_type: {
            type: 'number'
        },

        mood: {
            type: 'string'
        },

        gender: {
            type: 'string'
        },

        lang: {
            type: 'string'
        },

        rating: {
            type: 'number'
        },

        loudness: {
            type: 'number'
        },

        overlay: {
            type: 'number'
        },

        artist: {
            type: 'string'
        },

        original_artist: {
            type: 'string'
        },

        title: {
            type: 'string'
        },

        album: {
            type: 'string'
        },

        composer: {
            type: 'string'
        },

        label: {
            type: 'string'
        },

        year: {
            type: 'string'
        },

        track_no: {
            type: 'number'
        },

        disc_no: {
            type: 'number'
        },

        publisher: {
            type: 'string'
        },

        copyright: {
            type: 'string'
        },

        isrc: {
            type: 'string'
        },

        bpm: {
            type: 'number'
        },

        comments: {
            type: 'string'
        },

        sweepers: {
            type: 'string'
        },

        image: {
            type: 'string'
        },

        buy_link: {
            type: 'string'
        },

        url1: {
            type: 'string'
        },

        url2: {
            type: 'string'
        },

        tdate_played: {
            type: 'ref',
            columnType: 'datetime'
        },

        tartist_played: {
            type: 'ref',
            columnType: 'datetime'
        },

        originalmetadata: {
            type: 'number'
        },
        /*
        spins_7: {
            type: 'number'
        },
        
        spins_30: {
            type: 'number'
        },
        
        spins_ytd: {
            type: 'number'
        },
        
        spins_year: {
            type: 'number'
        },
        */
  },
  
  pending: [] // Tracks that have been removed but need to air eventually, and will be re-queued at the next break.

};

