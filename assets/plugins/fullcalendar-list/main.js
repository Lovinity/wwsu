/*!
FullCalendar v5.3.1
Docs & License: https://fullcalendar.io/
(c) 2020 Adam Shaw
*/
import './main.css';

import { getDateMeta, buildNavLinkData, getDayClassNames, createElement, RenderHook, formatDayString, BaseComponent, Fragment, createFormatter, EventRoot, isMultiDayRange, buildSegTimeText, memoize, ViewRoot, Scroller, NowTimer, sortEventSegs, getSegMeta, sliceEventStore, intersectRanges, DateComponent, startOfDay, addDays, identity, createPlugin } from '@fullcalendar/common';
import { __extends, __assign } from 'tslib';

var ListViewHeaderRow = /** @class */ (function (_super) {
    __extends(ListViewHeaderRow, _super);
    function ListViewHeaderRow() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ListViewHeaderRow.prototype.render = function () {
        var _a = this.props, dayDate = _a.dayDate, todayRange = _a.todayRange;
        var _b = this.context, theme = _b.theme, dateEnv = _b.dateEnv, options = _b.options, viewApi = _b.viewApi;
        var dayMeta = getDateMeta(dayDate, todayRange);
        var text = options.listDayFormat ? dateEnv.format(dayDate, options.listDayFormat) : ''; // will ever be falsy?
        var sideText = options.listDaySideFormat ? dateEnv.format(dayDate, options.listDaySideFormat) : ''; // will ever be falsy? also, BAD NAME "alt"
        var navLinkData = options.navLinks
            ? buildNavLinkData(dayDate)
            : null;
        var hookProps = __assign({ date: dateEnv.toDate(dayDate), view: viewApi, text: text,
            sideText: sideText,
            navLinkData: navLinkData }, dayMeta);
        var classNames = ['fc-list-day'].concat(getDayClassNames(dayMeta, theme));
        // TODO: make a reusable HOC for dayHeader (used in daygrid/timegrid too)
        return (createElement(RenderHook, { hookProps: hookProps, classNames: options.dayHeaderClassNames, content: options.dayHeaderContent, defaultContent: renderInnerContent, didMount: options.dayHeaderDidMount, willUnmount: options.dayHeaderWillUnmount }, function (rootElRef, customClassNames, innerElRef, innerContent) { return (createElement("tr", { ref: rootElRef, className: classNames.concat(customClassNames).join(' '), "data-date": formatDayString(dayDate) },
            createElement("th", { colSpan: 3 },
                createElement("div", { className: 'fc-list-day-cushion ' + theme.getClass('tableCellShaded'), ref: innerElRef }, innerContent)))); }));
    };
    return ListViewHeaderRow;
}(BaseComponent));
function renderInnerContent(props) {
    var navLinkAttrs = props.navLinkData // is there a type for this?
        ? { 'data-navlink': props.navLinkData, tabIndex: 0 }
        : {};
    return (createElement(Fragment, null,
        props.text &&
            createElement("a", __assign({ className: 'fc-list-day-text' }, navLinkAttrs), props.text),
        props.sideText &&
            createElement("a", __assign({ className: 'fc-list-day-side-text' }, navLinkAttrs), props.sideText)));
}

var DEFAULT_TIME_FORMAT = createFormatter({
    hour: 'numeric',
    minute: '2-digit',
    meridiem: 'short'
});
var ListViewEventRow = /** @class */ (function (_super) {
    __extends(ListViewEventRow, _super);
    function ListViewEventRow() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ListViewEventRow.prototype.render = function () {
        var _a = this, props = _a.props, context = _a.context;
        var seg = props.seg;
        var timeFormat = context.options.eventTimeFormat || DEFAULT_TIME_FORMAT;
        return (createElement(EventRoot, { seg: seg, timeText: '' /* BAD. because of all-day content */, disableDragging: true, disableResizing: true, defaultContent: renderEventInnerContent, isPast: props.isPast, isFuture: props.isFuture, isToday: props.isToday, isSelected: props.isSelected, isDragging: props.isDragging, isResizing: props.isResizing, isDateSelecting: props.isDateSelecting }, function (rootElRef, classNames, innerElRef, innerContent, hookProps) { return (createElement("tr", { className: ['fc-list-event', hookProps.event.url ? 'fc-event-forced-url' : ''].concat(classNames).join(' '), ref: rootElRef },
            buildTimeContent(seg, timeFormat, context),
            createElement("td", { className: 'fc-list-event-graphic' },
                createElement("span", { className: 'fc-list-event-dot', style: { borderColor: hookProps.borderColor || hookProps.backgroundColor } })),
            createElement("td", { className: 'fc-list-event-title', ref: innerElRef }, innerContent))); }));
    };
    return ListViewEventRow;
}(BaseComponent));
function renderEventInnerContent(props) {
    var event = props.event;
    var url = event.url;
    var anchorAttrs = url ? { href: url } : {};
    return (createElement("a", __assign({}, anchorAttrs), event.title));
}
function buildTimeContent(seg, timeFormat, context) {
    var options = context.options;
    if (options.displayEventTime !== false) {
        var eventDef = seg.eventRange.def;
        var eventInstance = seg.eventRange.instance;
        var doAllDay = false;
        var timeText = void 0;
        if (eventDef.allDay) {
            doAllDay = true;
        }
        else if (isMultiDayRange(seg.eventRange.range)) { // TODO: use (!isStart || !isEnd) instead?
            if (seg.isStart) {
                timeText = buildSegTimeText(seg, timeFormat, context, null, null, eventInstance.range.start, seg.end);
            }
            else if (seg.isEnd) {
                timeText = buildSegTimeText(seg, timeFormat, context, null, null, seg.start, eventInstance.range.end);
            }
            else {
                doAllDay = true;
            }
        }
        else {
            timeText = buildSegTimeText(seg, timeFormat, context);
        }
        if (doAllDay) {
            var hookProps = {
                text: context.options.allDayText,
                view: context.viewApi
            };
            return (createElement(RenderHook, { hookProps: hookProps, classNames: options.allDayClassNames, content: options.allDayContent, defaultContent: renderAllDayInner, didMount: options.allDayDidMount, willUnmount: options.allDayWillUnmount }, function (rootElRef, classNames, innerElRef, innerContent) { return (createElement("td", { className: ['fc-list-event-time'].concat(classNames).join(' '), ref: rootElRef }, innerContent)); }));
        }
        else {
            return (createElement("td", { className: 'fc-list-event-time' }, timeText));
        }
    }
    return null;
}
function renderAllDayInner(hookProps) {
    return hookProps.text;
}

/*
Responsible for the scroller, and forwarding event-related actions into the "grid".
*/
var ListView = /** @class */ (function (_super) {
    __extends(ListView, _super);
    function ListView() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.computeDateVars = memoize(computeDateVars);
        _this.eventStoreToSegs = memoize(_this._eventStoreToSegs);
        _this.setRootEl = function (rootEl) {
            if (rootEl) {
                _this.context.registerInteractiveComponent(_this, {
                    el: rootEl
                });
            }
            else {
                _this.context.unregisterInteractiveComponent(_this);
            }
        };
        return _this;
    }
    ListView.prototype.render = function () {
        var _this = this;
        var _a = this, props = _a.props, context = _a.context;
        var extraClassNames = [
            'fc-list',
            context.theme.getClass('table'),
            context.options.stickyHeaderDates !== false ? 'fc-list-sticky' : ''
        ];
        var _b = this.computeDateVars(props.dateProfile), dayDates = _b.dayDates, dayRanges = _b.dayRanges;
        var eventSegs = this.eventStoreToSegs(props.eventStore, props.eventUiBases, dayRanges);
        return (createElement(ViewRoot, { viewSpec: context.viewSpec, elRef: this.setRootEl }, function (rootElRef, classNames) { return (createElement("div", { ref: rootElRef, className: extraClassNames.concat(classNames).join(' ') },
            createElement(Scroller, { liquid: !props.isHeightAuto, overflowX: props.isHeightAuto ? 'visible' : 'hidden', overflowY: props.isHeightAuto ? 'visible' : 'auto' }, eventSegs.length > 0 ?
                _this.renderSegList(eventSegs, dayDates) :
                _this.renderEmptyMessage()))); }));
    };
    ListView.prototype.renderEmptyMessage = function () {
        var _a = this.context, options = _a.options, viewApi = _a.viewApi;
        var hookProps = {
            text: options.noEventsText,
            view: viewApi
        };
        return (createElement(RenderHook, { hookProps: hookProps, classNames: options.noEventsClassNames, content: options.noEventsContent, defaultContent: renderNoEventsInner, didMount: options.noEventsDidMount, willUnmount: options.noEventsWillUnmount }, function (rootElRef, classNames, innerElRef, innerContent) { return (createElement("div", { className: ['fc-list-empty'].concat(classNames).join(' '), ref: rootElRef },
            createElement("div", { className: 'fc-list-empty-cushion', ref: innerElRef }, innerContent))); }));
    };
    ListView.prototype.renderSegList = function (allSegs, dayDates) {
        var _a = this.context, theme = _a.theme, options = _a.options;
        var segsByDay = groupSegsByDay(allSegs); // sparse array
        return (createElement(NowTimer, { unit: 'day' }, function (nowDate, todayRange) {
            var innerNodes = [];
            for (var dayIndex = 0; dayIndex < segsByDay.length; dayIndex++) {
                var daySegs = segsByDay[dayIndex];
                if (daySegs) { // sparse array, so might be undefined
                    var dayStr = dayDates[dayIndex].toISOString();
                    // append a day header
                    innerNodes.push(createElement(ListViewHeaderRow, { key: dayStr, dayDate: dayDates[dayIndex], todayRange: todayRange }));
                    daySegs = sortEventSegs(daySegs, options.eventOrder);
                    for (var _i = 0, daySegs_1 = daySegs; _i < daySegs_1.length; _i++) {
                        var seg = daySegs_1[_i];
                        innerNodes.push(createElement(ListViewEventRow, __assign({ key: dayStr + ':' + seg.eventRange.instance.instanceId /* are multiple segs for an instanceId */, seg: seg, isDragging: false, isResizing: false, isDateSelecting: false, isSelected: false }, getSegMeta(seg, todayRange, nowDate))));
                    }
                }
            }
            return (createElement("table", { className: 'fc-list-table ' + theme.getClass('table') },
                createElement("tbody", null, innerNodes)));
        }));
    };
    ListView.prototype._eventStoreToSegs = function (eventStore, eventUiBases, dayRanges) {
        return this.eventRangesToSegs(sliceEventStore(eventStore, eventUiBases, this.props.dateProfile.activeRange, this.context.options.nextDayThreshold).fg, dayRanges);
    };
    ListView.prototype.eventRangesToSegs = function (eventRanges, dayRanges) {
        var segs = [];
        for (var _i = 0, eventRanges_1 = eventRanges; _i < eventRanges_1.length; _i++) {
            var eventRange = eventRanges_1[_i];
            segs.push.apply(segs, this.eventRangeToSegs(eventRange, dayRanges));
        }
        return segs;
    };
    ListView.prototype.eventRangeToSegs = function (eventRange, dayRanges) {
        var dateEnv = this.context.dateEnv;
        var nextDayThreshold = this.context.options.nextDayThreshold;
        var range = eventRange.range;
        var allDay = eventRange.def.allDay;
        var dayIndex;
        var segRange;
        var seg;
        var segs = [];
        for (dayIndex = 0; dayIndex < dayRanges.length; dayIndex++) {
            segRange = intersectRanges(range, dayRanges[dayIndex]);
            if (segRange) {
                seg = {
                    component: this,
                    eventRange: eventRange,
                    start: segRange.start,
                    end: segRange.end,
                    isStart: eventRange.isStart && segRange.start.valueOf() === range.start.valueOf(),
                    isEnd: eventRange.isEnd && segRange.end.valueOf() === range.end.valueOf(),
                    dayIndex: dayIndex
                };
                segs.push(seg);
                // detect when range won't go fully into the next day,
                // and mutate the latest seg to the be the end.
                if (!seg.isEnd && !allDay &&
                    dayIndex + 1 < dayRanges.length &&
                    range.end <
                        dateEnv.add(dayRanges[dayIndex + 1].start, nextDayThreshold)) {
                    seg.end = range.end;
                    seg.isEnd = true;
                    break;
                }
            }
        }
        return segs;
    };
    return ListView;
}(DateComponent));
function renderNoEventsInner(hookProps) {
    return hookProps.text;
}
function computeDateVars(dateProfile) {
    var dayStart = startOfDay(dateProfile.renderRange.start);
    var viewEnd = dateProfile.renderRange.end;
    var dayDates = [];
    var dayRanges = [];
    while (dayStart < viewEnd) {
        dayDates.push(dayStart);
        dayRanges.push({
            start: dayStart,
            end: addDays(dayStart, 1)
        });
        dayStart = addDays(dayStart, 1);
    }
    return { dayDates: dayDates, dayRanges: dayRanges };
}
// Returns a sparse array of arrays, segs grouped by their dayIndex
function groupSegsByDay(segs) {
    var segsByDay = []; // sparse array
    var i;
    var seg;
    for (i = 0; i < segs.length; i++) {
        seg = segs[i];
        (segsByDay[seg.dayIndex] || (segsByDay[seg.dayIndex] = []))
            .push(seg);
    }
    return segsByDay;
}

var OPTION_REFINERS = {
    listDayFormat: createFalsableFormatter,
    listDaySideFormat: createFalsableFormatter,
    noEventsClassNames: identity,
    noEventsContent: identity,
    noEventsDidMount: identity,
    noEventsWillUnmount: identity
    // noEventsText is defined in base options
};
function createFalsableFormatter(input) {
    return input === false ? null : createFormatter(input);
}

var main = createPlugin({
    optionRefiners: OPTION_REFINERS,
    views: {
        list: {
            component: ListView,
            buttonTextKey: 'list',
            listDayFormat: { month: 'long', day: 'numeric', year: 'numeric' } // like "January 1, 2016"
        },
        listDay: {
            type: 'list',
            duration: { days: 1 },
            listDayFormat: { weekday: 'long' } // day-of-week is all we need. full date is probably in headerToolbar
        },
        listWeek: {
            type: 'list',
            duration: { weeks: 1 },
            listDayFormat: { weekday: 'long' },
            listDaySideFormat: { month: 'long', day: 'numeric', year: 'numeric' }
        },
        listMonth: {
            type: 'list',
            duration: { month: 1 },
            listDaySideFormat: { weekday: 'long' } // day-of-week is nice-to-have
        },
        listYear: {
            type: 'list',
            duration: { year: 1 },
            listDaySideFormat: { weekday: 'long' } // day-of-week is nice-to-have
        }
    }
});

export default main;
export { ListView };
//# sourceMappingURL=main.js.map
