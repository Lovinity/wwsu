(function webpackUniversalModuleDefinition(root, factory) {
  if (typeof exports === "object" && typeof module === "object")
    module.exports = factory(require("moment"));
  else if (typeof define === "function" && define.amd)
    define("moment-recur-ts", ["moment"], factory);
  else if (typeof exports === "object")
    exports["moment-recur-ts"] = factory(require("moment"));
  else root["moment-recur-ts"] = factory(root["moment"]);
})(window, function (__WEBPACK_EXTERNAL_MODULE__0__) {
  return /******/ (function (modules) {
    // webpackBootstrap
    /******/ // The module cache
    /******/ var installedModules = {}; // The require function
    /******/
    /******/ /******/ function __webpack_require__(moduleId) {
      /******/
      /******/ // Check if module is in cache
      /******/ if (installedModules[moduleId]) {
        /******/ return installedModules[moduleId].exports;
        /******/
      } // Create a new module (and put it into the cache)
      /******/ /******/ var module = (installedModules[moduleId] = {
        /******/ i: moduleId,
        /******/ l: false,
        /******/ exports: {},
        /******/
      }); // Execute the module function
      /******/
      /******/ /******/ modules[moduleId].call(
        module.exports,
        module,
        module.exports,
        __webpack_require__
      ); // Flag the module as loaded
      /******/
      /******/ /******/ module.l = true; // Return the exports of the module
      /******/
      /******/ /******/ return module.exports;
      /******/
    } // expose the modules object (__webpack_modules__)
    /******/
    /******/
    /******/ /******/ __webpack_require__.m = modules; // expose the module cache
    /******/
    /******/ /******/ __webpack_require__.c = installedModules; // define getter function for harmony exports
    /******/
    /******/ /******/ __webpack_require__.d = function (exports, name, getter) {
      /******/ if (!__webpack_require__.o(exports, name)) {
        /******/ Object.defineProperty(exports, name, {
          enumerable: true,
          get: getter,
        });
        /******/
      }
      /******/
    }; // define __esModule on exports
    /******/
    /******/ /******/ __webpack_require__.r = function (exports) {
      /******/ if (typeof Symbol !== "undefined" && Symbol.toStringTag) {
        /******/ Object.defineProperty(exports, Symbol.toStringTag, {
          value: "Module",
        });
        /******/
      }
      /******/ Object.defineProperty(exports, "__esModule", { value: true });
      /******/
    }; // create a fake namespace object // mode & 1: value is a module id, require it // mode & 2: merge all properties of value into the ns // mode & 4: return value when already ns object // mode & 8|1: behave like require
    /******/
    /******/ /******/ /******/ /******/ /******/ /******/ __webpack_require__.t = function (
      value,
      mode
    ) {
      /******/ if (mode & 1) value = __webpack_require__(value);
      /******/ if (mode & 8) return value;
      /******/ if (
        mode & 4 &&
        typeof value === "object" &&
        value &&
        value.__esModule
      )
        return value;
      /******/ var ns = Object.create(null);
      /******/ __webpack_require__.r(ns);
      /******/ Object.defineProperty(ns, "default", {
        enumerable: true,
        value: value,
      });
      /******/ if (mode & 2 && typeof value != "string")
        for (var key in value)
          __webpack_require__.d(
            ns,
            key,
            function (key) {
              return value[key];
            }.bind(null, key)
          );
      /******/ return ns;
      /******/
    }; // getDefaultExport function for compatibility with non-harmony modules
    /******/
    /******/ /******/ __webpack_require__.n = function (module) {
      /******/ var getter =
        module && module.__esModule
          ? /******/ function getDefault() {
              return module["default"];
            }
          : /******/ function getModuleExports() {
              return module;
            };
      /******/ __webpack_require__.d(getter, "a", getter);
      /******/ return getter;
      /******/
    }; // Object.prototype.hasOwnProperty.call
    /******/
    /******/ /******/ __webpack_require__.o = function (object, property) {
      return Object.prototype.hasOwnProperty.call(object, property);
    }; // __webpack_public_path__
    /******/
    /******/ /******/ __webpack_require__.p = ""; // Load entry module and return exports
    /******/
    /******/
    /******/ /******/ return __webpack_require__((__webpack_require__.s = 5));
    /******/
  })(
    /************************************************************************/
    /******/ [
      /* 0 */
      /***/ function (module, exports) {
        module.exports = __WEBPACK_EXTERNAL_MODULE__0__;

        /***/
      },
      /* 1 */
      /***/ function (module, exports, __webpack_require__) {
        "use strict";

        var __values =
          (this && this.__values) ||
          function (o) {
            var m = typeof Symbol === "function" && o[Symbol.iterator],
              i = 0;
            if (m) return m.call(o);
            return {
              next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
              },
            };
          };
        Object.defineProperty(exports, "__esModule", { value: true });
        /**
         * Interval object for creating and matching interval-based rules
         * @internal
         * @hidden
         */
        var Interval = /** @class */ (function () {
          function Interval(units, measure, start) {
            if (!start) {
              throw new Error("Must have a start date set to set an interval!");
            }
            this.start = start.clone();
            this.measure = measure;
            this.units = this.normalizeUnits(units);
          }
          Interval.prototype.match = function (date) {
            var e_1, _a;
            var precise = this.measure !== "days";
            var diff = Math.abs(this.start.diff(date, this.measure, precise));
            try {
              // Check to see if any of the units provided match the date
              for (
                var _b = __values(this.units), _c = _b.next();
                !_c.done;
                _c = _b.next()
              ) {
                var unit = _c.value;
                // If the units divide evenly into the difference, we have a match
                if (diff % unit === 0) {
                  return true;
                }
              }
            } catch (e_1_1) {
              e_1 = { error: e_1_1 };
            } finally {
              try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
              } finally {
                if (e_1) throw e_1.error;
              }
            }
            return false;
          };
          Interval.prototype.next = function (currentDate) {
            // let precise = this.measure !== 'days'
            // Get the multiple of the start
            var diff = currentDate.diff(this.start, this.measure);
            // Find the next muliple for each unit
            var multiples = this.units.map(function (unit) {
              return (Math.floor(diff / unit) + 1) * unit;
            });
            multiples.sort(function (a, b) {
              return a - b;
            });
            return this.start.clone().add(multiples[0], this.measure);
          };
          Interval.prototype.previous = function (currentDate) {
            // let precise = this.measure !== 'days'
            // Get the multiple of the start
            var diff = this.start.diff(currentDate, this.measure);
            // Find the next muliple for each unit
            var multiples = this.units.map(function (unit) {
              return (Math.floor(diff / unit) + 1) * unit;
            });
            multiples.sort(function (a, b) {
              return b - a;
            });
            return this.start.clone().subtract(multiples[0], this.measure);
          };
          Interval.prototype.normalizeUnits = function (units) {
            // Make sure all of the units are integers greater than 0.
            return units
              .map(function (unit) {
                unit = +unit;
                if (unit <= 0) {
                  throw new Error("Intervals must be greater than zero.");
                }
                if (!Number.isInteger(unit)) {
                  throw new Error("Intervals must be integers.");
                }
                return unit;
              })
              .sort(function (a, b) {
                return a - b;
              });
          };
          return Interval;
        })();
        exports.Interval = Interval;

        /***/
      },
      /* 2 */
      /***/ function (module, exports, __webpack_require__) {
        "use strict";

        var __importDefault =
          (this && this.__importDefault) ||
          function (mod) {
            return mod && mod.__esModule ? mod : { default: mod };
          };
        Object.defineProperty(exports, "__esModule", { value: true });
        var moment_1 = __importDefault(__webpack_require__(0));
        /**
         * Calendar object for creating and matching calendar-based rules
         * @internal
         * @hidden
         */
        var Calendar = /** @class */ (function () {
          function Calendar(units, measure) {
            this.measure = measure;
            this.units = this.normalizeUnits(units);
            this.range = Calendar.ranges[this.measure].range;
            this.period = Calendar.ranges[this.measure].period;
          }
          Calendar.prototype.match = function (date) {
            // Get the unit based on the required measure of the date
            var unit = this.periodUnit(date);
            // If the unit is in our list, return true, else return false
            if (this.units.indexOf(unit) !== -1) {
              return true;
            }
            if (
              this.units[0] === -1 &&
              unit === this.periodUnit(moment_1.default(date).endOf(this.range))
            ) {
              return true;
            }
            return false;
          };
          Calendar.prototype.next = function (currentDateIn, limit) {
            var currentDate = currentDateIn.clone();
            // If still within our period, just give the next day
            if (!this.isLastDayOfPeriod(currentDate)) {
              var nextDateInPeriod = moment_1
                .default(currentDate)
                .add(1, "day");
              if (this.match(nextDateInPeriod)) return nextDateInPeriod;
            }
            while (true) {
              // Get the next period based on the measure
              var nextDate = this.nextPeriod(currentDate);
              if (nextDate) {
                return nextDate;
              } else {
                // No more units found within this range,
                // bump our range by one and try again.
                currentDate = this.incrementRange(currentDate, 1);
                // Check to see if next range starts on a valid period
                if (this.match(currentDate)) {
                  return currentDate;
                }
                if (currentDate.isSameOrAfter(limit)) {
                  throw new RangeError("Recurrence Year limit exceeded.");
                }
              }
            }
          };
          Calendar.prototype.previous = function (currentDateIn, limit) {
            var currentDate = currentDateIn.clone();
            // If still within our period, just give the next day
            if (!this.isFirstDayOfPeriod(currentDate)) {
              var nextDateInPeriod = moment_1
                .default(currentDate)
                .subtract(1, "day");
              if (this.match(nextDateInPeriod)) return nextDateInPeriod;
            }
            while (true) {
              // Get the next period based on the measure
              var nextDate = this.previousPeriod(currentDate);
              if (nextDate) {
                return nextDate;
              } else {
                // No more units found within this range,
                // bump our range by one and try again.
                currentDate = this.decrementRange(currentDate, 1);
                // Check to see if next range starts on a valid period
                if (this.match(currentDate)) {
                  return currentDate;
                }
                if (currentDate.isSameOrBefore(limit)) {
                  throw new RangeError("Recurrence Year limit exceeded.");
                }
              }
            }
          };
          Calendar.prototype.normalizeUnits = function (units) {
            var _this = this;
            var low = Calendar.ranges[this.measure].low;
            var high = Calendar.ranges[this.measure].high;
            return units
              .map(function (unitIn) {
                if (unitIn === "last") unitIn = -1;
                if (typeof unitIn !== "number") {
                  // Convert day/month names to numbers, if needed
                  if (_this.measure === "daysOfWeek") {
                    unitIn = moment_1.default().set("days", unitIn).get("days");
                  } else if (_this.measure === "monthsOfYear") {
                    unitIn = moment_1
                      .default()
                      .set("months", unitIn)
                      .get("months");
                  } else {
                    unitIn = +unitIn;
                  }
                }
                if (!Number.isInteger(unitIn)) {
                  throw new TypeError(
                    "Invalid calendar unit in recurrence: " + unitIn
                  );
                }
                if ((unitIn < low || unitIn > high) && unitIn !== -1) {
                  throw new RangeError(
                    "Value should be in range " + low + " to " + high
                  );
                }
                return unitIn;
              })
              .sort(function (a, b) {
                return a - b;
              });
          };
          Calendar.prototype.periodUnit = function (date, unit) {
            switch (this.measure) {
              case "daysOfWeek":
                return date.day(unit);
              case "daysOfMonth":
                return date.date(unit);
              case "weeksOfMonth":
                return date.monthWeek(unit);
              case "weeksOfMonthByDay":
                return date.monthWeekByDay(unit);
              case "weeksOfYear":
                return date.week(unit);
              case "monthsOfYear":
                return date.month(unit);
            }
          };
          Calendar.prototype.nextPeriod = function (date) {
            var _this = this;
            // Get the next period based on the measure
            var currentUnit = this.periodUnit(date);
            var nextUnit = this.units
              .map(function (unit) {
                return unit === -1
                  ? _this.periodUnit(date.clone().endOf(_this.range))
                  : unit;
              })
              .find(function (unit) {
                return unit > currentUnit;
              });
            if (nextUnit !== undefined) {
              return this.periodUnit(date.clone(), nextUnit).startOf(
                this.period
              );
            } else {
              // Weeks do not follow orderly periods, e.g. a year can begin and end on week 1
              if (
                this.measure === "weeksOfYear" &&
                this.units.indexOf(1) !== -1
              ) {
                return date.clone().endOf("year").startOf("week");
              }
              return undefined;
            }
          };
          Calendar.prototype.previousPeriod = function (date) {
            var _this = this;
            // Get the next period based on the measure
            var currentUnit = this.periodUnit(date);
            if (
              this.measure === "weeksOfYear" &&
              date.month() === 11 &&
              date.week() === 1
            )
              currentUnit = 53;
            var nextUnit = this.units
              .map(function (unit) {
                return unit === -1
                  ? _this.periodUnit(date.clone().endOf(_this.range))
                  : unit;
              })
              .reverse()
              .find(function (unit) {
                return unit < currentUnit;
              });
            if (nextUnit !== undefined) {
              if (this.measure === "weeksOfYear" && currentUnit === 53)
                date.week(0);
              return this.periodUnit(date.clone(), nextUnit).endOf(this.period);
            } else {
              // Weeks do not follow orderly periods, e.g. a year can begin and end on week 1
              if (
                this.measure === "weeksOfYear" &&
                this.units.some(function (u) {
                  return 52 >= u && u <= 53;
                })
              ) {
                return date.clone().startOf("year").endOf("week");
              }
              return undefined;
            }
          };
          Calendar.prototype.incrementRange = function (date, count) {
            return date.add(count, this.range).startOf(this.range);
          };
          Calendar.prototype.decrementRange = function (date, count) {
            return date.subtract(count, this.range).endOf(this.range);
          };
          Calendar.prototype.isLastDayOfPeriod = function (date) {
            if (this.measure === "weeksOfMonthByDay") {
              return (
                date.monthWeekByDay() !==
                moment_1.default(date).add(1, "day").monthWeekByDay()
              );
            }
            if (this.period === "day") {
              return true;
            } else {
              return date.isSame(moment_1.default(date).endOf(this.period));
            }
          };
          Calendar.prototype.isFirstDayOfPeriod = function (date) {
            if (this.measure === "weeksOfMonthByDay") {
              return (
                date.monthWeekByDay() !==
                moment_1.default(date).subtract(1, "day").monthWeekByDay()
              );
            }
            if (this.period === "day") {
              return true;
            } else {
              return date.isSame(moment_1.default(date).startOf(this.period));
            }
          };
          Calendar.ranges = {
            daysOfWeek: {
              period: "day",
              range: "week",
              low: 0,
              high: 6,
            },
            daysOfMonth: {
              period: "day",
              range: "month",
              low: 1,
              high: 31,
            },
            weeksOfMonth: {
              period: "week",
              range: "month",
              low: 0,
              high: 4,
            },
            weeksOfMonthByDay: {
              period: "week",
              range: "month",
              low: 0,
              high: 5, // 5 = last week of month, whether it's 3 or 4
            },
            weeksOfYear: {
              period: "week",
              range: "year",
              low: 1,
              high: 53,
            },
            monthsOfYear: {
              period: "month",
              range: "year",
              low: 0,
              high: 11,
            },
          };
          return Calendar;
        })();
        exports.Calendar = Calendar;

        /***/
      },
      /* 3 */
      /***/ function (module, exports, __webpack_require__) {
        "use strict";

        Object.defineProperty(exports, "__esModule", { value: true });
        var calendar_1 = __webpack_require__(2);
        var interval_1 = __webpack_require__(1);
        var Rule;
        (function (Rule) {
          /**
           * @internal
           * @hidden
           */
          Rule.MeasureSingleToPlural = {
            day: "days",
            week: "weeks",
            month: "months",
            year: "years",
            dayOfWeek: "daysOfWeek",
            dayOfMonth: "daysOfMonth",
            weekOfMonth: "weeksOfMonth",
            weekOfMonthByDay: "weeksOfMonthByDay",
            weekOfYear: "weeksOfYear",
            monthOfYear: "monthsOfYear",
          };
          /**
           * @internal
           * @hidden
           */
          function factory(units, measure, start) {
            var normMeasure = normalizeMeasure(measure);
            switch (normMeasure) {
              case "days":
              case "weeks":
              case "months":
              case "years":
                return new interval_1.Interval(
                  unitsToArray(units),
                  normMeasure,
                  start
                );
              case "daysOfWeek":
              case "daysOfMonth":
              case "weeksOfMonth":
              case "weeksOfMonthByDay":
              case "weeksOfYear":
              case "monthsOfYear":
                return new calendar_1.Calendar(
                  unitsToArray(units),
                  normMeasure
                );
            }
          }
          Rule.factory = factory;
          /**
           * @internal
           * @hidden
           */
          function unitsToArray(units) {
            if (units == null) {
              throw new Error("Units not defined for recurrence rule.");
            } else if (Array.isArray(units)) {
              return units;
            } else if (typeof units === "object") {
              return Object.keys(units);
            } else if (typeof units === "number") {
              return [units];
              // tslint:disable-next-line:strict-type-predicates
            } else if (typeof units === "string") {
              return [units];
            } else {
              throw new Error(
                "Provide an array, object, string or number when passing units!"
              );
            }
          }
          /**
           * Private function to pluralize measure names for use with dictionaries.
           * @internal
           * @hidden
           */
          function normalizeMeasure(measure) {
            if (typeof measure === "string") {
              if (Rule.MeasureSingleToPlural[measure]) {
                return Rule.MeasureSingleToPlural[measure];
              } else {
                for (var key in Rule.MeasureSingleToPlural) {
                  if (Rule.MeasureSingleToPlural[key] === measure)
                    return measure;
                }
              }
            }
            throw new Error("Invalid Measure for recurrence: " + measure);
          }
          Rule.normalizeMeasure = normalizeMeasure;
        })((Rule = exports.Rule || (exports.Rule = {})));

        /***/
      },
      /* 4 */
      /***/ function (module, exports, __webpack_require__) {
        "use strict";

        var __generator =
          (this && this.__generator) ||
          function (thisArg, body) {
            var _ = {
                label: 0,
                sent: function () {
                  if (t[0] & 1) throw t[1];
                  return t[1];
                },
                trys: [],
                ops: [],
              },
              f,
              y,
              t,
              g;
            return (
              (g = { next: verb(0), throw: verb(1), return: verb(2) }),
              typeof Symbol === "function" &&
                (g[Symbol.iterator] = function () {
                  return this;
                }),
              g
            );
            function verb(n) {
              return function (v) {
                return step([n, v]);
              };
            }
            function step(op) {
              if (f) throw new TypeError("Generator is already executing.");
              while (_)
                try {
                  if (
                    ((f = 1),
                    y &&
                      (t =
                        op[0] & 2
                          ? y["return"]
                          : op[0]
                          ? y["throw"] || ((t = y["return"]) && t.call(y), 0)
                          : y.next) &&
                      !(t = t.call(y, op[1])).done)
                  )
                    return t;
                  if (((y = 0), t)) op = [op[0] & 2, t.value];
                  switch (op[0]) {
                    case 0:
                    case 1:
                      t = op;
                      break;
                    case 4:
                      _.label++;
                      return { value: op[1], done: false };
                    case 5:
                      _.label++;
                      y = op[1];
                      op = [0];
                      continue;
                    case 7:
                      op = _.ops.pop();
                      _.trys.pop();
                      continue;
                    default:
                      if (
                        !((t = _.trys),
                        (t = t.length > 0 && t[t.length - 1])) &&
                        (op[0] === 6 || op[0] === 2)
                      ) {
                        _ = 0;
                        continue;
                      }
                      if (
                        op[0] === 3 &&
                        (!t || (op[1] > t[0] && op[1] < t[3]))
                      ) {
                        _.label = op[1];
                        break;
                      }
                      if (op[0] === 6 && _.label < t[1]) {
                        _.label = t[1];
                        t = op;
                        break;
                      }
                      if (t && _.label < t[2]) {
                        _.label = t[2];
                        _.ops.push(op);
                        break;
                      }
                      if (t[2]) _.ops.pop();
                      _.trys.pop();
                      continue;
                  }
                  op = body.call(thisArg, _);
                } catch (e) {
                  op = [6, e];
                  y = 0;
                } finally {
                  f = t = 0;
                }
              if (op[0] & 5) throw op[1];
              return { value: op[0] ? op[1] : void 0, done: true };
            }
          };
        var __values =
          (this && this.__values) ||
          function (o) {
            var m = typeof Symbol === "function" && o[Symbol.iterator],
              i = 0;
            if (m) return m.call(o);
            return {
              next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
              },
            };
          };
        var __importDefault =
          (this && this.__importDefault) ||
          function (mod) {
            return mod && mod.__esModule ? mod : { default: mod };
          };
        Object.defineProperty(exports, "__esModule", { value: true });
        var moment_1 = __importDefault(__webpack_require__(0));
        var rule_1 = __webpack_require__(3);
        /**
         * @internal
         * @hidden
         */
        var ISO_DATE_FMT = "YYYY-MM-DD";
        /**
         * The main Recur object to provide an interface for settings, rules, and matching
         *
         * Creating Rules
         * --------------
         * moment-recur-ts uses rules to define when a date should recur. You can then generate future
         * or past recurrences based on these rules, or see if a specific date matches the rules.
         * Rules can also be overridden or removed.
         *
         * ### Length Intervals
         * moment-recur-ts supports intervals for days, weeks, months, and years. Measurements may be singular or
         * plural (ex: `day()` vs `days()`). Length Intervals **must** have a start date defined.
         *
         * Possible Length Intervals Include:
         * * day / days
         * * week / weeks
         * * month / months
         * * year / years
         *
         * ### Calendar Intervals
         * Calendar Intervals do not depend on a start date. They define a unit of another unit. For instance,
         * a day of a month, or a month of a year. Measurements may be singular or plural
         * (ex: `dayOfMonth()` vs `daysOfMonth()`).
         *
         * Possible Calendar Intervals Include:
         * * dayOfWeek / daysOfWeek
         * * dayOfMonth / daysOfMonth
         * * weekOfMonth / weeksOfMonth
         * * weekOfYear / weeksOfYear
         * * monthOfYear / monthsOfYear
         */
        var Recur = /** @class */ (function () {
          /**
           * ### Recur Object Constrcutor
           *
           * From an instance of moment:
           * ```js
           * let recurrence;
           *
           * // Create a recurrence using today as the start date.
           * recurrence = moment().recur();
           *
           * // Create a recurrence while passing the start and end dates to the recur function.
           * // Note: passing an end date requires you to also pass a start date.
           * recurrence = moment().recur( start, end );
           *
           * // You may pass a start date to the moment, or use an existing moment, to set the start date.
           * // In this case, passing a date to the recur function sets and end date.
           * recurrence = moment(start).recur( end );
           *
           * // Finally, you can create a recurrence and pass in an entire set of options.
           * recurrence = moment().recur({
           *   start: "01/01/2014",
           *   end: "01/01/2015"
           * });
           * ```
           * From static moment:
           * ```js
           * // Create recurrence without a start date. Note: this will not work with intervals.
           * recurrence = moment.recur();
           *
           * // Create a recurrence, passing just the start, or the start and end dates.
           * recurrence = moment.recur( start, end );
           *
           * // Create a recurrence, passing set of options.
           * recurrence = moment.recur({
           *   start: "01/01/2014",
           *   end: "01/01/2015"
           * });
           * ```
           */
          function Recur(options) {
            var _this = this;
            /**
             * @internal
             * @hidden
             */
            this.reversed = false;
            /**
             * @internal
             * @hidden
             */
            this.maximumYears = 1000;
            if (options.start) {
              this.start = moment_1.default(options.start).dateOnly();
            }
            if (options.end) {
              this.end = moment_1.default(options.end).dateOnly();
            }
            // Our list of rules, all of which must match
            this.rules = (options.rules || []).map(function (rule) {
              return rule_1.Rule.factory(rule.units, rule.measure, _this.start);
            });
            // Our list of exceptions. Match always fails on these dates.
            var exceptions = options.exceptions || [];
            this.exceptions = exceptions.map(function (ex) {
              return moment_1.default(ex).dateOnly();
            });
            // Temporary units integer, array, or object. Does not get imported/exported.
            this.units = null;
            // Temporary measure type. Does not get imported/exported.
            this.measure = null;
            // Temporary from date for next/previous. Does not get imported/exported.
            this.from = undefined;
            this.addMeasureFunctions();
            return this;
          }
          Recur.prototype.startDate = function (date) {
            if (date === null) {
              this.start = undefined;
              return this;
            }
            if (date) {
              this.start = moment_1.default(date).dateOnly();
              return this;
            }
            if (!this.start) {
              throw new Error("No start date defined for recurrence.");
            }
            return this.start;
          };
          Recur.prototype.endDate = function (date) {
            if (date === null) {
              this.end = undefined;
              return this;
            }
            if (date) {
              this.end = moment_1.default(date).dateOnly();
              return this;
            }
            if (!this.end) {
              throw new Error("No end date defined for recurrence.");
            }
            return this.end;
          };
          Recur.prototype.fromDate = function (date) {
            if (date === null) {
              this.from = undefined;
              return this;
            }
            if (date) {
              this.from = moment_1.default(date).dateOnly();
              return this;
            }
            if (!this.from) {
              throw new Error("No from date defined for recurrence.");
            }
            return this.from;
          };
          Recur.prototype.maxYears = function (years) {
            if (years) {
              this.maximumYears = years;
              return this;
            } else {
              return this.maximumYears;
            }
          };
          /**
           * Use `save()` to export all options, rules, and exceptions as an object.
           * This can be used to store recurrences in a database.
           * > Note: This does not export the "From Date" which is considered a temporary option.
           * ```js
           * recurrence.save();
           * ```
           */
          Recur.prototype.save = function () {
            var data = {};
            if (this.start && moment_1.default(this.start).isValid()) {
              data.start = this.start.format(ISO_DATE_FMT);
            }
            if (this.end && moment_1.default(this.end).isValid()) {
              data.end = this.end.format(ISO_DATE_FMT);
            }
            data.exceptions = this.exceptions.map(function (date) {
              return date.format(ISO_DATE_FMT);
            });
            data.rules = this.rules;
            return data;
          };
          /**
           * Use `repeats()` to check if a recurrence has rules set.
           * ```js
           * recurrence.repeats(); // true/false
           * ```
           */
          Recur.prototype.repeats = function () {
            return this.rules.length > 0;
          };
          /**
           * The `every()` function allows you to set the units and, optionally, the measurment type
           * of the recurring date. It returns the recur object to allow chaining.
           *
           *  ```js
           *  let myDate, recurrence;
           *
           *  // Create a date to start from
           *  myDate = moment("01/01/2014");
           *
           *  // You can pass the units to recur on, and the measurement type.
           *  recurrence = myDate.recur().every(1, "days");
           *
           *  // You can also chain the measurement type instead of passing it to every.
           *  recurrence = myDate.recur().every(1).day();
           *
           *  // It is also possible to pass an array of units.
           *  recurrence = myDate.recur().every([3, 5]).days();
           *
           *  // When using the dayOfWeek measurement, you can pass days names.
           *  recurrence = myDate.recur().every(["Monday", "wed"]).daysOfWeek();
           *
           *  // Month names also work when using monthOfYear.
           *  recurrence = myDate.recur().every(["Jan", "february"], "monthsOfYear");
           *  ```
           *
           *  `every()` will override the last "every" if a measurement was not provided.
           *  The following line will create a recurrence for every 5 days.
           *  ```js
           *  recurrence  = myDate.recur().every(1).every(5).days();
           *  ```
           *  If you need to specify multiple units, pass an array to `every()`.
           *
           *  You may also pass the units directly to the interval functions (listed below)
           *  instead of using `every()`.
           *  ```js
           *  let recurrence = moment.recur().monthOfYear("January");
           *  ```
           */
          Recur.prototype.every = function (units, measure) {
            if (units != null) {
              this.units = units;
            }
            if (measure != null) {
              this.measure = measure;
            }
            // Don't create the rule until measure is defined
            if (!this.measure) {
              return this;
            }
            var rule = rule_1.Rule.factory(
              this.units,
              this.measure,
              this.start
            );
            if (
              rule.measure === "weeksOfMonthByDay" &&
              !this.hasRule("daysOfWeek")
            ) {
              throw new Error(
                "weeksOfMonthByDay must be combined with daysOfWeek"
              );
            }
            // Remove the temporary rule data
            this.units = null;
            this.measure = null;
            // Remove existing rule based on measure
            this.rules = this.rules.filter(function (oldRule) {
              return oldRule.measure !== rule.measure;
            });
            this.rules.push(rule);
            return this;
          };
          /**
           * To prevent a date from matching that would normally match, use the `except()` function.
           * ```js
           * let recurrence = moment("01/01/2014").recur().every(1).day().except("01/02/2014");
           * recurrence.matches("01/02/2014"); // false
           * ```
           */
          Recur.prototype.except = function (date) {
            date = moment_1.default(date).dateOnly();
            this.exceptions.push(date);
            return this;
          };
          /**
           * Forgets rules (by passing measure) and exceptions (by passing date)
           * ```js
           * // Exceptions can be removed by passing a date to the forget() function.
           * recurrence.forget("01/03/2014");
           * ```
           * ```js
           * // Rules can be removed by passing the measurement to the forget() function.
           * recurrence.forget("days");
           * ```
           */
          Recur.prototype.forget = function (dateOrRule, format) {
            if (!dateOrRule) {
              throw new Error(
                "Invalid input for recurrence forget: " + dateOrRule
              );
            }
            try {
              var normMeasure_1 = rule_1.Rule.normalizeMeasure(dateOrRule);
              this.rules = this.rules.filter(function (rule) {
                return rule.measure !== normMeasure_1;
              });
              return this;
            } catch (err) {
              var date_1 = moment_1.default(dateOrRule, format);
              // If valid date, try to remove it from exceptions
              if (date_1.isValid()) {
                date_1 = date_1.dateOnly(); // change to date only for perfect comparison
                this.exceptions = this.exceptions.filter(function (exception) {
                  return !date_1.isSame(exception);
                });
                return this;
              } else {
                throw new Error(
                  "Invalid input for recurrence forget: " + dateOrRule
                );
              }
            }
          };
          /**
           * Checks if a rule has been set on the chain
           */
          Recur.prototype.hasRule = function (measure) {
            return (
              this.rules.findIndex(function (rule) {
                return rule.measure === rule_1.Rule.normalizeMeasure(measure);
              }) !== -1
            );
          };
          /**
           * The `matches()` function will test a date to check if all of the recurrence rules match.
           * It returns `true` if the date matches, `false` otherwise.
           * ```js
           * let interval = moment("01/01/2014").recur().every(2).days();
           * interval.matches("01/02/2014"); // false
           * interval.matches("01/03/2014"); // true
           * ```
           *
           * You may also see if a date matches before the start date or after the end date by
           * passing `true` as the second argument to `matches()`.
           * ```js
           * let interval = moment("01/01/2014").recur().every(2).days();
           * interval.matches("12/30/2013"); // false
           * interval.matches("12/30/2013", true); // true
           * ```
           */
          Recur.prototype.matches = function (dateToMatch, ignoreStartEnd) {
            var date = moment_1.default(dateToMatch).dateOnly();
            if (!date.isValid()) {
              throw Error(
                "Invalid date supplied to match method: " + dateToMatch
              );
            }
            if (!ignoreStartEnd && !this.inRange(date)) {
              return false;
            }
            if (this.isException(date)) {
              return false;
            }
            if (!this.matchAllRules(date)) {
              return false;
            }
            // if we passed everything above, then this date matches
            return true;
          };
          /**
           * Iterate over moments matched by rules
           * > Note if there is no end date, results are unbounded (you must manually terminate the iterator).
           *
           * > Also note, this exapmle intentionally ignores some complicated leap year math.
           *
           * ```js
           * let recurrence = moment('2012-01').recur('2032-01').every(4).years()
           * let leapYears = [...recurrence].map(m => m.year())
           * // leapYears = [ 2012, 2016, 2020, 2024, 2028, 2032 ]
           * ```
           * Or, this is a bit faster...
           * ```js
           * let recurrence = moment('2012-01').recur('2032-01').every(4).years()
           * let leapYears = []
           * for (let date of recurrence) {
           *   leapYears.push(date.year())
           * }
           * // leapYears = [ 2012, 2016, 2020, 2024, 2028, 2032 ]
           * ```
           */
          Recur.prototype[Symbol.iterator] = function () {
            var startFrom, currentDate;
            return __generator(this, function (_a) {
              switch (_a.label) {
                case 0:
                  startFrom = this.from || this.start;
                  if (!startFrom || !startFrom.isValid()) {
                    throw Error(
                      "Cannot get occurrences without start or from date."
                    );
                  }
                  if (this.end && startFrom > this.end) {
                    throw Error("Start date cannot be later than end date.");
                  }
                  currentDate = startFrom.clone();
                  if (!this.matchAllRules(currentDate)) return [3 /*break*/, 2];
                  return [4 /*yield*/, currentDate.clone()];
                case 1:
                  _a.sent();
                  _a.label = 2;
                case 2:
                  try {
                    currentDate = this.reversed
                      ? this.findPreviousMatch(currentDate)
                      : this.findNextMatch(currentDate);
                  } catch (err) {
                    /* istanbul ignore else */
                    if (err instanceof RangeError)
                      return [2 /*return*/, undefined];
                    else throw err;
                  }
                  if (this.end && currentDate.isAfter(this.end))
                    return [3 /*break*/, 5];
                  if (!!this.isException(currentDate)) return [3 /*break*/, 4];
                  return [4 /*yield*/, currentDate.clone()];
                case 3:
                  _a.sent();
                  _a.label = 4;
                case 4:
                  return [3 /*break*/, 2];
                case 5:
                  return [2 /*return*/];
              }
            });
          };
          /**
           * Reverse iterator direction
           * > Note since there is no end date, results are unbounded (you must manually terminate the iterator).
           *
           * ```js
           * let mondays = []
           * for (let monday of moment().recur().every('Monday').dayOfWeek().reverse()) {
           *   lastThreeMondays.push(monday)
           *   if (mondays.length > 10) break
           * }
           * ```
           */
          Recur.prototype.reverse = function () {
            this.reversed = !this.reversed;
            return this;
          };
          Recur.prototype.all = function (format) {
            var e_1, _a;
            if (!this.end || !this.end.isValid()) {
              throw Error("Cannot get all occurrences without an end date.");
            }
            this.reversed = false;
            var dates = [];
            try {
              for (
                var _b = __values(this), _c = _b.next();
                !_c.done;
                _c = _b.next()
              ) {
                var date = _c.value;
                dates.push(format ? date.format(format) : date);
              }
            } catch (e_1_1) {
              e_1 = { error: e_1_1 };
            } finally {
              try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
              } finally {
                if (e_1) throw e_1.error;
              }
            }
            return dates;
          };
          Recur.prototype.next = function (num, format) {
            var e_2, _a;
            if (!num) return [];
            var dates = [];
            var count = 0;
            this.reversed = false;
            try {
              for (
                var _b = __values(this), _c = _b.next();
                !_c.done;
                _c = _b.next()
              ) {
                var date = _c.value;
                if (!(this.start && date.isSame(this.start))) {
                  dates.push(format ? date.format(format) : date);
                  count++;
                }
                if (count >= num) break;
              }
            } catch (e_2_1) {
              e_2 = { error: e_2_1 };
            } finally {
              try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
              } finally {
                if (e_2) throw e_2.error;
              }
            }
            return dates;
          };
          Recur.prototype.previous = function (num, format) {
            var e_3, _a;
            if (!num) return [];
            var dates = [];
            var count = 0;
            this.reversed = true;
            try {
              for (
                var _b = __values(this), _c = _b.next();
                !_c.done;
                _c = _b.next()
              ) {
                var date = _c.value;
                if (!(this.start && date.isSame(this.start))) {
                  dates.push(format ? date.format(format) : date);
                  count++;
                }
                if (count >= num) break;
              }
            } catch (e_3_1) {
              e_3 = { error: e_3_1 };
            } finally {
              try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
              } finally {
                if (e_3) throw e_3.error;
              }
            }
            return dates;
          };
          /**
           * @internal
           */
          Recur.prototype.addMeasureFunctions = function () {
            var _this = this;
            var e_4, _a;
            var _loop_1 = function (measureSingle) {
              var measurePlural =
                rule_1.Rule.MeasureSingleToPlural[measureSingle];
              Recur.prototype[measureSingle] = function (units) {
                _this.every(units, measurePlural);
                return _this;
              };
              Recur.prototype[measurePlural] = function (units) {
                _this.every(units, measurePlural);
                return _this;
              };
            };
            try {
              for (
                var _b = __values(
                    Object.keys(rule_1.Rule.MeasureSingleToPlural)
                  ),
                  _c = _b.next();
                !_c.done;
                _c = _b.next()
              ) {
                var measureSingle = _c.value;
                _loop_1(measureSingle);
              }
            } catch (e_4_1) {
              e_4 = { error: e_4_1 };
            } finally {
              try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
              } finally {
                if (e_4) throw e_4.error;
              }
            }
          };
          /**
           * Private function to see if a date is within range of start/end
           * @internal
           */
          Recur.prototype.inRange = function (date) {
            if (this.start && date.isBefore(this.start)) {
              return false;
            } else if (this.end && date.isAfter(this.end)) {
              return false;
            } else {
              return true;
            }
          };
          /**
           * Private function to check if a date is an exception
           * @internal
           */
          Recur.prototype.isException = function (date) {
            var e_5, _a;
            try {
              for (
                var _b = __values(this.exceptions), _c = _b.next();
                !_c.done;
                _c = _b.next()
              ) {
                var exception = _c.value;
                if (moment_1.default(exception).isSame(date)) {
                  return true;
                }
              }
            } catch (e_5_1) {
              e_5 = { error: e_5_1 };
            } finally {
              try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
              } finally {
                if (e_5) throw e_5.error;
              }
            }
            return false;
          };
          /**
           * Private funtion to see if all rules match
           * @internal
           * @hidden
           */
          Recur.prototype.matchAllRules = function (date) {
            var e_6, _a;
            try {
              for (
                var _b = __values(this.rules), _c = _b.next();
                !_c.done;
                _c = _b.next()
              ) {
                var rule = _c.value;
                if (!rule.match(date)) {
                  return false;
                }
              }
            } catch (e_6_1) {
              e_6 = { error: e_6_1 };
            } finally {
              try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
              } finally {
                if (e_6) throw e_6.error;
              }
            }
            return true;
          };
          /**
           * Private funtion to see if all rules match
           * @internal
           * @hidden
           */
          Recur.prototype.findNextMatch = function (currentDate) {
            var nextDate = currentDate.clone().add(1, "day");
            var limit = currentDate.clone().add(this.maximumYears, "years");
            var allRulesMatch = false;
            while (!allRulesMatch) {
              // if (nextDate.year() >= currentDate.year() + this.maximumYears) {
              //   throw new RangeError()
              // }
              nextDate.subtract(1, "day");
              var nextDates = this.rules.map(function (rule) {
                return rule.next(nextDate, limit);
              });
              nextDates.sort(function (a, b) {
                return a.diff(b);
              });
              nextDate = nextDates[nextDates.length - 1];
              allRulesMatch = nextDate.isSame(nextDates[0]);
            }
            return nextDate;
          };
          /**
           * Private funtion to see if all rules match
           * @internal
           * @hidden
           */
          Recur.prototype.findPreviousMatch = function (currentDate) {
            var nextDate = currentDate.clone().subtract(1, "day");
            var limit = currentDate
              .clone()
              .subtract(this.maximumYears, "years");
            var allRulesMatch = false;
            while (!allRulesMatch) {
              // if (nextDate.year() <= currentDate.year() - this.maximumYears) {
              //   throw new RangeError()
              // }
              nextDate.add(1, "day");
              var nextDates = this.rules.map(function (rule) {
                return rule.previous(nextDate, limit);
              });
              nextDates.sort(function (a, b) {
                return b.diff(a);
              });
              nextDate = nextDates[nextDates.length - 1];
              allRulesMatch = nextDate.isSame(nextDates[0]);
            }
            return nextDate;
          };
          return Recur;
        })();
        exports.Recur = Recur;

        /***/
      },
      /* 5 */
      /***/ function (module, exports, __webpack_require__) {
        "use strict";

        var __importDefault =
          (this && this.__importDefault) ||
          function (mod) {
            return mod && mod.__esModule ? mod : { default: mod };
          };
        Object.defineProperty(exports, "__esModule", { value: true });
        var moment_1 = __importDefault(__webpack_require__(0));
        var recur_1 = __webpack_require__(4);
        moment_1.default.fn.monthWeek = function (week) {
          if (week === undefined) {
            // First day of the first week of the month
            var week0 = this.clone().startOf("month").startOf("week");
            // First day of week
            var day0 = this.clone().startOf("week");
            return day0.diff(week0, "weeks");
          } else {
            var weekDiff = week - this.monthWeek();
            return this.clone().add(weekDiff, "weeks");
          }
        };
        moment_1.default.fn.monthWeekByDay = function (week) {
          if (week === undefined) {
            return Math.floor((this.date() - 1) / 7);
          // WWSU added support for "last week of month"
          } else if (week === 5) {
            var mom = this.clone();
            var lastWeek = mom.month() !== mom.add(1, "weeks").month();
            while (!lastWeek) {
              lastWeek = mom.month() !== mom.add(1, "weeks").month();
            }
            return mom.subtract(1, "weeks");
          } else {
            var weekDiff = week - this.monthWeekByDay();
            return this.clone().add(weekDiff, "weeks");
          }
        };
        // Plugin for removing all time information from a given date
        moment_1.default.fn.dateOnly = function () {
          // return this.startOf('day')
          return this.isValid()
            ? moment_1.default.utc(this.format("YYYY-MM-DD"))
            : this;
        };
        moment_1.default.recur = function (start, end) {
          // If we have an object, use it as a set of options
          if (typeof start === "object" && !moment_1.default.isMoment(start)) {
            var options = start;
            return new recur_1.Recur(options);
          }
          // else, use the values passed
          return new recur_1.Recur({ start: start, end: end });
        };
        moment_1.default.fn.recur = function (start, end) {
          // If we have an object, use it as a set of options
          if (start === Object(start) && !moment_1.default.isMoment(start)) {
            var options = start;
            // if we have no start date, use the moment
            if (options.start === undefined) {
              options.start = this;
            }
            return new recur_1.Recur(options);
          }
          // if there is no end value, use the start value as the end
          if (!end) {
            end = start;
            start = undefined;
          }
          // use the moment for the start value
          if (!start) {
            start = this;
          }
          return new recur_1.Recur({ start: start, end: end });
        };

        /***/
      },
      /******/
    ]
  );
});
//# sourceMappingURL=moment-recur-ts.js.map
