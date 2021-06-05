// Manages 12-hour analog clocks with Chart.js donut charts

// REQUIRES these WWSU modules: WWSUutil, WWSUMeta, WWSUanimations

class WWSUclocks {
  /**
   * Construct the class
   *
   * @param {WWSUmodules} manager The WWSUmodules which loaded this module.
   * @param {?object} options Options to pass to the module
   */
  constructor(manager, options) {
    this.manager = manager;

    this.clocks = new Map();
  }

  // Initialize clock system. Should be called before adding any clocks, but after all WWSU modules are added.
  init() {
    // Tick all the clocks whenever WWSUMeta ticks
    this.manager.get("WWSUMeta").on("metaTick", "WWSUclocks", (meta) => {
      // Calculate rotation of clock hands
      let now = moment.parseZone(meta.time),
        h = now.hours(),
        m = now.minutes(),
        s = now.seconds(),
        ms = 0,
        degS,
        degM,
        degH;

      degS = s * 6 + (6 / 1000) * ms;
      degM = m * 6 + (6 / 60) * s + (6 / (60 * 1000)) * ms;
      degH = h * 30 + (30 / 60) * m;

      this.clocks.forEach((clock, name) => {
        // Set hand positions on each clock
        $(`#clock-${name}-clock .clock-second`).css({
          transform: "rotate(" + degS + "deg)",
        });
        $(`#clock-${name}-clock .clock-minute`).css({
          transform: "rotate(" + degM + "deg)",
        });
        $(`#clock-${name}-clock .clock-hour`).css({
          transform: "rotate(" + degH + "deg)",
        });

        let size = Math.min(
          $(`#clock-${name}-chart`).width(),
          $(`#clock-${name}-chart`).height()
        );
        size = size * 0.77; // TODO: dynamically adjust this according to cutoutPercentage
        $(`#clock-${name}-clock`).css("width", `${size}px`);
        $(`#clock-${name}-clock`).css("height", `${size}px`);
        $(`#clock-${name}-clock`).css("margin-top", `-${size / 2}px`);
        $(`#clock-${name}-clock`).css("margin-left", `-${size / 2}px`);
      });
    });
  }

  /**
   * Make a new clock.
   *
   * @param {string} name Unique alphanumeric name for the clock.
   * @param {string} dom DOM query string of the div container to locate the clock. (NOTE: this div should be position relative!)
   * @param {string} size The CSS size of the clock (both height and width will equal this)
   * @param {?object} data Optional initial data set to set the donut as
   * @param {?object} options Optional options to pass to Chart.js when creating the donut chart
   */
  new(name, dom, data = {}, options = {}) {
    if (this.clocks.has(name)) return; // Do not create clocks that already exist.

    // Merge default doughnut options
    options = Object.assign(
      {
        maintainAspectRatio: false,
        responsive: true,
        cutoutPercentage: 66,
        legend: {
          display: false,
        },
        animation: {
          animateRotate: false,
          animateScale: false,
        },
        elements: {
          arc: {
            borderColor: "rgba(0, 0, 0, 0)",
          },
        },
      },
      options
    );

    // Add necessary elements to the DOM to create the clock
    $(dom).append(`
        <canvas
			id="clock-${name}-chart"
			style="
                min-height: 50vh;
                height: 66vh;
                max-width: 100%;
			"
		>
		</canvas>
		<div
		    class="clock-container"
			id="clock-${name}-clock"
			style="user-select: none; pointer-events: none"
		>
		    <div class="clock">
			    <div class="clock-hour"></div>
			    <div class="clock-minute"></div>
			    <div class="clock-second"></div>
			    <div class="clock-center"></div>
			</div>
		</div>
    `);

    // Construct the donut chart when ready
    this.manager.get("WWSUutil").waitForElement(`#clock-${name}-chart`, () => {
      let canvas = $(`#clock-${name}-chart`).get(0).getContext("2d");

      // Create Chart.js and save it to the map
      this.clocks.set(
        name,
        new Chart(canvas, {
          type: "doughnut",
          data: data,
          options: options,
        })
      );
    });

    // Construct the clock face when ready
    this.manager.get("WWSUutil").waitForElement(`#clock-${name}-clock`, () => {
      // Add ticks to clock face at each minute
      let addTick = (n) => {
        let tickClass = "smallTick",
          tickBox = $('<div class="faceBox"></div>'),
          tick = $("<div></div>"),
          tickNum = "";

        if (n % 5 === 0) {
          tickClass = n % 15 === 0 ? "largeTick" : "mediumTick";
          tickNum = $('<div class="tickNum"></div>')
            .text(n / 5)
            .css({ transform: "rotate(-" + n * 6 + "deg)" });
          if (n >= 50) {
            tickNum.css({ left: "-0.5em" });
          }
        }
        tickBox
          .append(tick.addClass(tickClass))
          .css({ transform: "rotate(" + n * 6 + "deg)" });
        tickBox.append(tickNum);
        $(`#clock-${name}-clock .clock`).append(tickBox);
      };
      for (let x = 1; x <= 60; x += 1) {
        addTick(x);
      }
    });
  }

  /**
   * Update the chart dataset of a clock.
   *
   * @param {string} name Name of the clock's chart to update
   * @param {object} data Chart.js dataset
   */
  updateChart(name, data) {
    this.manager.get("WWSUanimations").add(`update-clock-${name}`, () => {
      let chart = this.clocks.get(name);
      if (!chart) return;

      chart.data = data;
      chart.update();
    });
  }
}
