// Constructor class for Alpaca Forms
class AlpacaCalendar {

    /**
     * Construct an Alpaca form for adding / editing calendar events and schedules
     * 
     * @param {string} alpaca DOM query string to generate the Alpaca form
     * @param {iziModal} modal iziModal containing the form, if applicable
     * @param {string} modalTitle DOM query string of the modal title, if applicable
     * @param {string} title Title for this form
     * @param {string} modalFooter DOM query string for the modal footer, if applicable
     * @param {string} type Event type
     * @param {TaffyDB} djs TAFFY DJ records
     * @param {TaffyDB} directors TAFFY director records
     * @param {object} defaultData Default values for the fields
     */
    constructor(alpaca, modal, modalTitle, title, modalFooter, type, djs, directors, defaultData = {}) {
        this.properties = {
            "type": {
                "type": "string",
                "title": "Event Type",
                "default": type,
            }
        };

        this.options = {
            "type": {
                "type": "hidden"
            },
        };

        this._djs = djs;
        this._directors = directors;

        this.alpaca = alpaca;
        this.modal = modal;
        this.modalTitle = modalTitle;
        this.modalFooter = modalFooter;
        this.title = title;

        this.alpacaOptions = {
            "schema": {
                "title": title,
                "type": "object",
                "properties": {}
            },

            "options": {
                "fields": {},
            },

            "data": defaultData
        }

        switch (type) {
            case 'show': {
                Object.assign(this.alpacaOptions.schema.properties, this.name.properties, this.priority.properties, this.djs.properties, this.start.properties, this.end.properties, this.description.properties, this.schedule.properties);
                Object.assign(this.alpacaOptions.options.fields, this.name.options.fields, this.priority.options.fields, this.djs.options.fields, this.start.options.fields, this.end.options.fields, this.description.options.fields, this.schedule.options.fields);
                console.dir(this.alpacaOptions);
                this.generateForm();
            }
        }

    }

    // Create the Alpaca form
    generateForm () {
        $(this.alpaca).html("");
        $(this.modalTitle).html(this.title);
        $(this.alpaca).alpaca(this.alpacaOptions);
        try {
            this.modal.iziModal('open');
        } catch (e) {
            // Consumed error
        }
    }

    parseData (data) {

    }

    // Field that asks for event priority
    get priority () {
        return {
            properties: {
                "priority": {
                    "type": "number",
                    "title": "Event Priority",
                    "minimum": -1,
                    "maximum": 10
                },
            },
            options: {
                "fields": {
                    "priority": {
                        "type": "integer",
                        "helper": `Conflict resolution. -1 = disable. 0 = overridden only by other 0 events. 1-10 = overrides lower priority events, is overridden by same or higher priority events. Defaults to ${calendardb.getDefaultPriority({ type: 'show' })} if left blank.`,
                    },
                },
            }
        }
    }

    // Fields for filling in DJ hosts.
    get djs () {
        return {
            properties: {
                "hostDJ": {
                    "type": "number",
                    "required": true,
                    "title": "Host DJ",
                    "enum": this._djs.map((dj) => dj.ID),
                },
                "cohostDJ1": {
                    "type": "number",
                    "title": "Co-Host DJ (1)",
                    "enum": this._djs.map((dj) => dj.ID),
                },
                "cohostDJ2": {
                    "type": "number",
                    "title": "Co-Host DJ (2)",
                    "enum": this._djs.map((dj) => dj.ID),
                },
                "cohostDJ3": {
                    "type": "number",
                    "title": "Co-Host DJ (3)",
                    "enum": this._djs.map((dj) => dj.ID),
                },
            },
            options: {
                "fields": {
                    "hostDJ": {
                        "type": "select",
                        "optionLabels": this._djs.map((dj) => dj.name),
                        "helper": "The DJ who signed up for this show, or the official WWSU producer for shows run by non-WWSU people."
                    },
                    "cohostDJ1": {
                        "type": "select",
                        "optionLabels": this._djs.map((dj) => dj.name),
                        "helper": "If another DJ runs this show together with the host DJ, specify them here."
                    },
                    "cohostDJ2": {
                        "type": "select",
                        "optionLabels": this._djs.map((dj) => dj.name),
                        "helper": "If there is a third DJ who runs this show, specify them here."
                    },
                    "cohostDJ3": {
                        "type": "select",
                        "optionLabels": this._djs.map((dj) => dj.name),
                        "helper": "If there is a fourth DJ who runs this show, specify them here."
                    },
                }
            }
        }
    }

    // Fill in the name of the event without constraints
    get name () {
        return {
            properties: {
                "name": {
                    "type": "string",
                    "required": !this.alpacaOptions.data.name,
                    "title": "Name of Show",
                    "maxLength": 255
                },
            },
            options: {}
        }
    }

    // WYSIWYG editor for event description
    get description () {
        return {
            properties: {
                "description": {
                    "type": "string",
                    "title": "Description of Show"
                }
            },
            options: {
                "fields": {
                    "description": {
                        "type": "summernote",
                        "summernote": {
                            "toolbar": [
                                [ 'style', [ 'bold', 'italic', 'underline', 'clear' ] ],
                                [ 'font', [ 'strikethrough', 'superscript', 'subscript' ] ],
                                [ 'fontsize', [ 'fontsize' ] ],
                                [ 'color', [ 'color' ] ],
                                [ 'para', [ 'ul', 'ol', 'paragraph' ] ],
                                [ 'height', [ 'height' ] ]
                            ],
                            "popover": {
                                "air": [
                                    [ 'color', [ 'color' ] ],
                                    [ 'font', [ 'bold', 'underline', 'clear' ] ]
                                ]
                            }
                        },
                    },
                }
            }
        }
    }

    // Start date for the event
    get start () {
        return {
            properties: {
                "start": {
                    "type": "string",
                    "title": "Start Date",
                    "format": "date"
                }
            },
            options: {
                "fields": {
                    "start": {
                        "helper": "The date this event should start. For shows, you should set this to the start of the semester / schedule rotation.",
                        "dateFormat": "YYYY-MM-DD HH:mm",
                    }
                }
            },
            parseOut: (value) => moment(value).toISOString(true),
            parseIn: (value) => moment(value).format("YYYY-MM-DD HH:mm")
        }
    }

    // End date for the event
    get end () {
        return {
            properties: {
                "end": {
                    "type": "string",
                    "title": "End Date",
                    "format": "date",
                    "required": !this.alpacaOptions.data.end
                }
            },
            options: {
                "fields": {
                    "end": {
                        "helper": "The last day for this event. For recurring shows, you should set this to the end of the semester / schedule rotation.",
                        "dateFormat": "YYYY-MM-DD HH:mm",
                    }
                }
            },
            parseOut: (value) => moment(value).toISOString(true),
            parseIn: (value) => moment(value).format("YYYY-MM-DD HH:mm")
        }
    }

    // Duration of the event, in minutes
    get duration () {
        return {
            properties: {
                "duration": {
                    "type": "number",
                    "title": "Duration in Minutes",
                    "minimum": 1,
                    "required": !this.alpacaOptions.data.duration
                },
            },
            options: {
                "fields": {
                    "duration": {
                        "type": "number",
                        "helper": `Number of minutes this event lasts. Currently, calendar does not support different durations for different recurring schedule rules, but will in the future.`,
                    },
                }
            }
        }
    }

    // one-time / recurring schedule field
    get schedule () {
        return {
            properties: {
                "schedule": {
                    "title": "Schedules",
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "dw": {
                                "title": "Days of the Week",
                                "enum": [ 1, 2, 3, 4, 5, 6, 7 ],
                                "required": true
                            },
                            "h": {
                                "title": "Hour(s) to start on each selected day",
                                "enum": [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23 ],
                                "required": true
                            },
                            "m": {
                                "title": "Minute of each hour to start",
                                "type": "number",
                                "required": true
                            }
                        }
                    }
                }
            },
            options: {
                "fields": {
                    "schedule": {
                        "type": "array",
                        "actionbar": {
                            "showLabels": true,
                            "actions": [ {
                                "label": "Add",
                                "action": "add"
                            }, {
                                "label": "Remove",
                                "action": "remove"
                            }, {
                                "label": "Move Up",
                                "action": "up",
                            }, {
                                "label": "Move Down",
                                "action": "down",
                            } ]
                        },
                        "items": {
                            "fields": {
                                "dw": {
                                    "type": "select",
                                    "multiple": true,
                                    "size": 3,
                                    "optionLabels": [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ],
                                    "sort": (a, b) => a.value < b.value ? -1 : 1,
                                },
                                "h": {
                                    "type": "select",
                                    "multiple": true,
                                    "size": 5,
                                    "optionLabels": [ "12 AM", "1 AM", "2 AM", "3 AM", "4 AM", "5 AM", "6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM", "9 PM", "10 PM", "11 PM" ],
                                    "sort": (a, b) => a.value < b.value ? -1 : 1
                                },
                                "m": {
                                    "type": "integer",
                                    "minimum": 0,
                                    "maximum": 59,
                                    "helper": "For example, if you selected 3 PM and 7 PM for the hours, and you specify 30 here, the event will start at 3:30 PM and 7:30 PM."
                                }
                            }
                        }
                    }
                }
            },
            parseOut: (value) => {
                return {
                    schedule: {
                        schedules: value.schedule.map((sch) => {

                            if (sch.dw) {
                                sch.dw = sch.dw.split(",");
                                sch.dw = sch.dw.map((sch2) => parseInt(sch2));
                            }

                            if (sch.h) {
                                sch.h = sch.h.split(",");
                                sch.h = sch.h.map((sch2) => parseInt(sch2));
                            }

                            if (sch.m) {
                                sch.m = [ parseInt(sch.m) ];
                            }

                            return sch;
                        })
                    }
                }
            },
            parseIn: (value) => {
                if (value && value !== null && value.schedules) {
                    return value.schedules.map((sch) => {
                        if (sch.dw) {
                            sch.dw = sch.dw.join(",");
                        }

                        if (sch.h) {
                            sch.h = sch.h.join(",");
                        }

                        if (sch.m) {
                            sch.m = sch.m.join(",");
                        }

                        return sch;
                    })
                }
            }
        }
    }
}
