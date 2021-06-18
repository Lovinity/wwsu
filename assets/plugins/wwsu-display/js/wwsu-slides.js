// This class manages slides and tickers on the display signs as a whole;
// WWSUslide is an individual slide (and should not be used explicitly; use this.add instead)
// WWSUticker is an individual ticker (and should not be used explicitly; use this.addTicker instead)

class WWSUslides {
  /**
   * Construct the WWSU slides management
   *
   * @param {WWSUmodules} manager The WWSUmodules that initiated this.
   * @param {?object} options Options to pass into the module
   * @param {string} options.nav DOM query string where we should place the ul elements for sidebar nav.
   * @param {string} options.classes String of DOM classes to assign to every nav ul created (do NOT include d-none!)
   * @param {string} options.classes DOM query where the HTML contents of each slide should be created (as sections)
   */
  constructor(manager, options = {}) {
    // Assign default options and replace defaults with any specified
    options = Object.assign(
      {
        nav: `.sidebar-nav`,
        classes: `nav nav-sidebar nav-flat flex-column`,
        contents: `#slide-contents`,
        ticker: `#footer-ticker`,
      },
      options
    );

    this.manager = manager;
    this.options = options;

    // This is where we keep track of the slides and tickers added
    this.slides = new Map();
    this.tickers = new Map();
    this.categories = [];

    // Properties for cycling slides
    this.active = null; // Name of the slide currently displayed
    this.timeLeft = 0; // Number of seconds left before display switches to the next slide
    this.timeLeftFailsafe = 0; // In case timeLeft is null when it should not be

    // Properties for tickers
    this.tickerActive = null; // Name of the ticker currently displayed.
    this.tickerTimeLeft = 0; // Number of seconds left before display switches to the next ticker
    this.tickerTimeLeftFailsafe = 0; // In case tickerTimeLeft is null when it should not be

    this.timer = setInterval(() => {
      // SLIDES

      if (this.timeLeft !== null) {
        this.timeLeft--;
        this.timeLeftFailsafe = 0;

        if (this.timeLeft <= 0) {
          this.timeLeft = 0;

          let activeSlides = this.qualified;

          // Determine based on the above which slide we should show next
          let currentIndex = activeSlides
            .map((slide) => slide.name)
            .indexOf(this.active);
          let qualified = activeSlides.filter(
            (value, index) => index > currentIndex
          );

          if (qualified.length <= 0) {
            qualified = activeSlides;

            if (qualified.length > 0) {
              this.show(qualified[0].name);
            } else {
              this.active = null;
              this.timeLeft = 5;
            }
          } else {
            this.show(qualified[0].name);
          }
        }

        this.updateSidebar();

        // Failsafe in case we get stuck in timeLeft = null
      } else if (this.qualified.length > 1) {
        this.timeLeftFailsafe++;
        if (this.timeLeftFailsafe >= 10) {
          this.timeLeftFailsafe = 0;
          this.timeLeft = 15;
        }
      } else {
        this.timeLeftFailsafe = 0;
      }

      // TICKERS
      if (this.tickerTimeLeft !== null) {
        this.tickerTimeLeftFailsafe = 0;

        // Bail if the current ticker is a marquee and still in progress
        if (
          this.activeTicker &&
          this.activeTicker.marquee &&
          this.tickerTimeLeft > 0
        )
          return;

        this.tickerTimeLeft--;

        if (this.tickerTimeLeft <= 0) {
          this.tickerTimeLeft = 0;

          let activeTickers = this.qualifiedTickers;

          // Determine based on the above which slide we should show next
          let currentIndex = activeTickers
            .map((ticker) => ticker.name)
            .indexOf(this.tickerActive);
          let qualified = activeTickers.filter(
            (value, index) => index > currentIndex
          );

          if (qualified.length <= 0) {
            qualified = activeTickers;

            if (qualified.length > 0) {
              this.showTicker(qualified[0].name);
            } else {
              this.tickerActive = null;
              this.tickerTimeLeft = 5;
            }
          } else {
            this.showTicker(qualified[0].name);
          }
        }

        this.updateTickers();
      } else if (this.qualifiedTickers.length > 1) {
        this.tickerTimeLeftFailsafe++;
        if (this.tickerTimeLeftFailsafe >= 10) {
          this.tickerTimeLeftFailsafe = 0;
          this.tickerTimeLeft = 15;
        }
      } else {
        this.tickerTimeLeftFailsafe = 0;
      }
    }, 1000);
  }

  /**
   * Add a new category of slides in the sidebar menu
   *
   * @param {string} name DOM compatible name
   * @param {string} label Text to display for the group on the sidebar
   */
  addCategory(name, label) {
    if (this.categories.indexOf(name) === -1) {
      this.categories.push(name);
      $(`${this.options.nav}`).append(`
          <ul class="${this.options.classes} d-none" id="sidebar-slides-${name}-ul" data-widget="treeview" role="menu" data-accordion="false">
                <li class="nav-header">${label}</li>
           </ul>
          `);
      this.updateSidebar();
    }
  }

  /**
   * Add a new slide
   *
   * @param {object} data WWSUslide properties (see WWSUslide)
   */
  add(data) {
    // Check if the slide already exists. If so, replace it instead of adding a new one.
    let changed = false;
    [...this.slides.values()]
      .filter((slide) => slide && slide.name === data.name)
      .forEach((slide) => {
        changed = true;
        this.remove(slide.name);
        this.slides.set(slide.name, new WWSUslide(this, data));
        this.updateSidebar();
      });
    if (!changed) {
      this.slides.set(data.name, new WWSUslide(this, data));
      this.updateSidebar();
    }
  }

  /**
   * Add a ticker
   *
   * @param {object} data WWSUticker properties (see WWSUticker)
   */

  addTicker(data) {
    // Check if the ticker already exists. If so, replace it instead of adding a new one.
    let changed = false;
    [...this.tickers.values()]
      .filter((ticker) => ticker && ticker.name === data.name)
      .forEach((ticker) => {
        changed = true;
        this.removeTicker(ticker.name);
        this.tickers.set(ticker.name, new WWSUticker(this, data));
        this.updateTickers();
      });
    if (!changed) {
      this.tickers.set(data.name, new WWSUticker(this, data));
      this.updateTickers();
    }
  }

  /**
   * Remove a slide.
   *
   * @param {string} name Name of the slide to remove
   */
  remove(name) {
    this.slides.forEach((_slide, slideName) => {
      if (_slide.name === name) {
        if (slideName === this.active) {
          this.active = null;
          this.timeLeft = 0;
        }
        $(`#sidebar-slide-${_slide.name}`).remove();
        $(`#section-slide-${_slide.name}`).remove();
        this.slides.delete(name);
      }
    });
    this.updateSidebar();
  }

  /**
   * Remove a ticker.
   *
   * @param {string} name Name of the ticker to remove
   */
  removeTicker(name) {
    this.tickers.forEach((_ticker, tickerName) => {
      if (_ticker.name === name) {
        if (tickerName === this.tickerActive) {
          this.tickerActive = null;
          this.tickerTimeLeft = 0;
        }
        $(`#ticker-${_ticker.name}`).remove();
        $(`#ticker-${_ticker._name}-contents`).marquee("destroy");
        clearInterval(_ticker.flashClassesTimer);
        this.tickers.delete(name);
      }
    });
    this.updateTickers();
  }

  /**
   * Transition to the specified slide.
   *
   * @param {string} name Name of the slide to display.
   */
  show(name) {
    this.timeLeft = null; // Timeout the time left

    // Call fnEnd if it exists for the active slide
    if (this.activeSlide && this.activeSlide.fnEnd) {
      this.activeSlide.fnEnd();
    }

    // If the provided slide to show is not the one currently visible, switch to it.
    if (!this.activeSlide || name !== this.activeSlide.name) {
      // Executed when we are ready to show the slide
      let afterFunction = () => {
        let slide = this.slides.get(name);

        // Whoops! The provided slide does not exist. Start over in the slides as a failsafe.
        if (!slide) {
          this.timeLeft = 0;
          this.active = null;
          return null;
        }

        this.active = name;

        // Perform HTML reset if applicable
        if (this.activeSlide && this.activeSlide.reset)
          this.activeSlide.reset = true;

        // Failsafe: iterate through all slides and add display: none to prevent stray slides from remaining visible
        this.slides.forEach((_slide, slideName) => {
          _slide.visible = false;
        });

        // Call fnStart if it exists
        if (this.activeSlide && this.activeSlide.fnStart) {
          this.activeSlide.fnStart();
        }

        // Animate slide in
        this.activeSlide.transitionIn(() => {
          this.timeLeft = this.activeSlide.displayTime;
          this.updateSidebar();
        });

        this.updateSidebar();

        this.fitContent();
      };

      // Process transitioning out of the current slide
      if (this.active) {
        // Transition the current slide out
        this.activeSlide.transitionOut(() => {
          afterFunction();
        });
      } else {
        afterFunction();
      }
    } else {
      // Perform HTML reset if applicable
      if (this.activeSlide && this.activeSlide.reset)
        this.activeSlide.reset = true;

      // Failsafe: iterate through all slides and add display: none to prevent stray slides from remaining visible
      this.slides.forEach((_slide, slideName) => {
        _slide.visible = false;
      });

      // Call fnStart if it exists
      if (this.activeSlide && this.activeSlide.fnStart) {
        this.activeSlide.fnStart();
      }

      // Display current slide immediately
      this.activeSlide.visible = true;

      this.timeLeft = this.activeSlide.displayTime;
      this.updateSidebar();

      this.fitContent();
    }
  }

  /**
   * Transition to the specified ticker.
   *
   * @param {string} name Name of the ticker to display.
   */
  showTicker(name) {
    this.tickerTimeLeft = null; // Timeout the time left

    // Call fnEnd if it exists for the active ticker
    if (this.activeTicker && this.activeTicker.fnEnd) {
      this.activeTicker.fnEnd();
    }

    // If the provided slide to show is not the one currently visible, or if the slide is a marquee (we have to restart it), switch to it.
    if (
      !this.activeTicker ||
      name !== this.activeTicker.name ||
      this.activeTicker.marquee
    ) {
      // Executed when we are ready to show the ticker
      let afterFunction = () => {
        let ticker = this.tickers.get(name);

        // Whoops! The provided ticker does not exist. Start over in the tickers as a failsafe.
        if (!ticker) {
          this.tickerTimeLeft = 0;
          this.tickerActive = null;
          return null;
        }

        this.tickerActive = name;

        // Perform HTML reset if applicable
        if (this.activeTicker && this.activeTicker.reset)
          this.activeTicker.reset = true;

        // Failsafe: iterate through all ckers and add display: none to prevent stray tickers from remaining visible
        this.tickers.forEach((_ticker, tickerName) => {
          _ticker.visible = false;
        });

        // Call fnStart if it exists
        if (this.activeTicker && this.activeTicker.fnStart) {
          this.activeTicker.fnStart();
        }

        // Animate ticker in
        this.activeTicker.transitionIn(() => {
          this.tickerTimeLeft = this.activeTicker.marquee
            ? 5
            : this.activeTicker.displayTime;
          this.updateTickers();
        });

        this.updateTickers();
      };

      // Process transitioning out of the current slide
      if (this.activeTicker) {
        // Transition the current slide out
        this.activeTicker.transitionOut(() => {
          afterFunction();
        });
      } else {
        afterFunction();
      }
    } else {
      // Perform HTML reset if applicable
      if (this.activeTicker && this.activeTicker.reset)
        this.activeTicker.reset = true;

      // Failsafe: iterate through all ckers and add display: none to prevent stray tickers from remaining visible
      this.tickers.forEach((_ticker, tickerName) => {
        _ticker.visible = false;
      });

      // Call fnStart if it exists
      if (this.activeTicker && this.activeTicker.fnStart) {
        this.activeTicker.fnStart();
      }

      // Display current ticker immediately
      this.activeTicker.visible = true;

      this.tickerTimeLeft = this.activeTicker.marquee
        ? 5
        : this.activeTicker.displayTime;
      this.updateTickers();
    }
  }

  // Update visibility of categories and slides... and update badge counters... for the sidebar
  updateSidebar() {
    // First, determine category visibility
    this.categories.forEach((category) => {
      // Determine if there is at least one active slide in this category
      let hasSlide = [...this.slides.values()].find((slide) => {
        if (slide.category !== category) return false; // Ignore slide if it is not in this category
        if (!slide.active) return false; // Ignore inactive slides
        if (this.hasActiveSticky && !slide.isSticky) return false; // Ignore active slides if there is an active sticky slide present and this slide is not sticky
        return true;
      });

      // Set the d-none class for this category accordingly
      if (hasSlide) {
        $(`#sidebar-slides-${category}-ul`).removeClass("d-none");
      } else {
        $(`#sidebar-slides-${category}-ul`).addClass("d-none");
      }
    });

    // Next, iterate through every slide
    this.slides.forEach((slide) => {
      // Hide inactive slides and show active ones
      if (!slide.active || (this.hasActiveSticky && !slide.isSticky)) {
        $(`#sidebar-slide-${slide.name}`).addClass("d-none");
      } else {
        $(`#sidebar-slide-${slide.name}`).removeClass("d-none");
      }

      // Highlight the slide currently visible on the screen (and show counter), otherwise remove highlight and counter
      if (slide.name === this.active) {
        $(`#sidebar-slide-${slide.name} a`).addClass("active");
        $(`#sidebar-counter-${slide.name}`).removeClass("d-none");
        $(`#sidebar-counter-${slide.name}`).html(
          this.timeLeft >= 0 && this.qualified.length > 1 ? this.timeLeft : "-"
        );
      } else {
        $(`#sidebar-slide-${slide.name} a`).removeClass("active");
        $(`#sidebar-counter-${slide.name}`).addClass("d-none");
      }

      // Whoops! The currently visible slide is not supposed to be visible. Time it out to go to the next slide.
      if (
        slide.name === this.active &&
        (!slide.active || (this.hasActiveSticky && !slide.isSticky))
      )
        this.timeLeft = 0;
    });
  }

  updateTickers() {
    this.tickers.forEach((ticker) => {
      // Whoops! The currently visible ticker is not supposed to be visible. Time it out to go to the next ticker.
      if (
        ticker.name === this.tickerActive &&
        (!ticker.active || (this.hasActiveStickyTicker && !ticker.isSticky))
      )
        this.tickerTimeLeft = 0;
    });
  }

  // Scale content of the active slide to fit the screen if fitContent is true (otherwise, reset to 1 scaling)
  fitContent() {
    let temp = $(`#section-slide-${this.activeSlide.name}`).first();
    let temp2 = $(`#section-slide-${this.activeSlide.name}-contents`).first();

    if (this.activeSlide.fitContent && temp && temp2) {
      temp.addClass("scale-wrapper");
      temp2.addClass("scale-content");

      var pageWidth;
      var pageHeight;

      var basePage = {
        width: temp.width(),
        height: temp.height(),
        scale: 1,
        scaleX: 1,
        scaleY: 1,
      };

      $(() => {
        let $page = temp;

        getPageSize();
        scalePages($page, pageWidth, pageHeight);

        window.requestAnimationFrame(() => {
          getPageSize();
          scalePages($page, pageWidth, pageHeight);
          setTimeout(() => {
            getPageSize();
            scalePages($page, pageWidth, pageHeight);
          }, 500);
        });

        function getPageSize() {
          pageHeight = temp.outerHeight();
          pageWidth = temp.outerWidth();
        }

        function scalePages(page, maxWidth, maxHeight) {
          var width = (temp2.height() / maxHeight) * 80;
          page.attr("width", `${width}%`);
          var scaleX = 1;
          var scaleY = 1;
          scaleX = (maxWidth / temp2.width()) * 0.95;
          scaleY = (maxHeight / temp2.height()) * 0.95;
          basePage.scaleX = scaleX;
          basePage.scaleY = scaleY;
          basePage.scale = scaleX > scaleY ? scaleY : scaleX;

          var newLeftPos = Math.abs(
            Math.floor((temp2.width() * basePage.scale - maxWidth) / 2)
          );
          var newTopPos = Math.abs(
            Math.floor((temp2.height() * basePage.scale - maxHeight) / 2)
          );

          temp2.attr(
            "style",
            "transform:scale(" +
              basePage.scale +
              ");left:" +
              newLeftPos +
              "px;top:0px;"
          );
        }
      });

      // Failsafe for fitContent. When it's false, we should always have 1 scale and 100% width.
    } else {
      var $page = temp;
      $page.attr("width", `100%`);
      temp2.attr("style", "transform:scale(1);left:0px;top:0px;");
    }
  }

  // Return the active WWSUslide
  get activeSlide() {
    return this.slides.get(this.active);
  }

  // Return the active WWSUticker
  get activeTicker() {
    return this.tickers.get(this.tickerActive);
  }

  // Check if there is an active sticky slide
  get hasActiveSticky() {
    return [...this.slides.values()].find(
      (slide) => slide.isSticky && slide.active
    )
      ? true
      : false;
  }

  // Check if there is an active sticky ticker
  get hasActiveStickyTicker() {
    return [...this.tickers.values()].find(
      (ticker) => ticker.isSticky && ticker.active
    )
      ? true
      : false;
  }

  // Array of slides that are allowed to be displayed at this time.
  get qualified() {
    // Determine which slides qualify to be displayed
    let activeSlides = [];
    if (this.hasActiveSticky) {
      this.slides.forEach((slide) => {
        if (slide.active && slide.isSticky) activeSlides.push(slide);
      });
    } else {
      this.slides.forEach((slide) => {
        if (slide.active) activeSlides.push(slide);
      });
    }

    // Sort according to category
    return activeSlides.sort((a, b) => {
      return (
        this.categories.indexOf(a.category) -
        this.categories.indexOf(b.category)
      );
    });
  }

  // Array of tickers that are allowed to be displayed at this time.
  get qualifiedTickers() {
    // Determine which tickers qualify to be displayed
    let activeTickers = [];
    if (this.hasActiveStickyTicker) {
      this.tickers.forEach((ticker) => {
        if (ticker.active && ticker.isSticky) activeTickers.push(ticker);
      });
    } else {
      this.tickers.forEach((ticker) => {
        if (ticker.active) activeTickers.push(ticker);
      });
    }

    // Sort according to category
    return activeTickers.sort((a, b) => {
      return (
        this.categories.indexOf(a.category) -
        this.categories.indexOf(b.category)
      );
    });
  }
}

// Slide class for managing a single slide
// DO NOT use this class directly; use the slides factory function instead.
class WWSUslide {
  /**
   * Create a slide.
   *
   * @param {WWSUslides} slides The WWSUslides that added this slide
   * @param {object} options Initial slide options. See constructor for properties.
   */
  constructor(slides, options = {}) {
    this.slides = slides;

    this._name = options.name || ""; // Unique name (DOM ID) assigned to the slide
    this._category = options.category || ""; // The nav sidebar group to place this slide (DOM)
    this._label = options.label || "Unknown"; // Text displayed in the slide menu sidebar (should keep under 24 characters!)
    this._isSticky = options.isSticky || false; // If true, all non-sticky slides will be hidden as long as one sticky slide is present
    this._icon = options.icon || "fas fa-dot-circle"; // Fontawesome icon class for the slide in the sidebar
    this._color = options.color || "secondary"; // Color class for the slide icon in the sidebar
    this._active =
      typeof options.active !== `undefined` ? options.active : true; // Whether or not to display this slide
    this._starts = options.starts || null; // Date/time to start showing this slide
    this._expires = options.expires || null; // Date/time to stop showing this slide
    this._originalHtml = options.html || ``; // Original HTML contents of this slide
    this._html = options.html || ``; // Current HTML contents of this slide
    this._reset = options.reset || false; // If true, reset the slide's HTML content to the original whenever it is displayed
    this._transitionIn = options.transitionIn || "fadeIn"; // Animate.css animation class when the slide appears
    this._transitionOut = options.transitionOut || "fadeOut"; // Animate.css animation class when the slide disappears
    this._displayTime = options.displayTime || 14; // Number of seconds the slide should be displayed
    this._fitContent = options.fitContent || false; // Use advanced CSS to shrink/grow slide contents to fit the container it is in
    this._fnStart = options.fnStart || (() => {}); // Callback executed when the slide is first displayed. Passes the slide as a parameter.
    this._fnEnd = options.fnEnd || (() => {}); // Callback executed when the slide is ending (ran out of displayTime). Passes the slide as a parameter.

    // Create the slide in the sidebar
    $(`#sidebar-slides-${this._category}-ul`).append(`
    <li class="nav-item" id="sidebar-slide-${this._name}" style="width: 300px;">
              <a href="#" class="nav-link" style="width: 300px;">
                <i class="nav-icon ${this._icon} text-${this._color}"></i>
                <p>${this._label}</p>
                <span class="badge badge-primary right d-none" id="sidebar-counter-${this._name}">0</span>
              </a>
    </li>
    `);

    // Add click handler for clicking through the slides
    $(`#sidebar-slide-${this._name}`).unbind("click");
    $(`#sidebar-slide-${this._name}`).on("click", () => {
      this.slides.show(this._name);
    });

    // Create the HTML section for the contents
    $(`${this.slides.options.contents}`).append(`
    <section id="section-slide-${this._name}" style="display: none;">
      <div id="section-slide-${this._name}-contents">${this._html}</div>
    </section>
    `);
  }

  get name() {
    return this._name;
  }

  get category() {
    return this._category;
  }

  get label() {
    return this._label;
  }

  // Sets a new label for the slide and updates all slides.
  set label(value) {
    this._label = value;
    this.slides.updateSidebar();
  }

  get isSticky() {
    return this._isSticky;
  }

  // Changes whether or not this slide is sticky, and updates all slides.
  set isSticky(value) {
    this._isSticky = value;
    this.slides.updateSidebar();
  }

  get icon() {
    return this._icon;
  }

  set icon(value) {
    this._icon = value;
    this.slides.updateSidebar();
  }

  get color() {
    return this._color;
  }

  set color(value) {
    this._color = value;
    this.slides.updateSidebar();
  }

  get reset() {
    return this._reset;
  }

  // Set whether or not this slide should reset to original HTML upon visible. Also, if true, perform the reset.
  set reset(value) {
    this._reset = value;
    if (value) {
      $(`#section-slide-${this._name}`).html(
        `<div id="section-slide-${this._name}-contents">${this._originalHtml}</div>`
      );
    }
  }

  // Determine whether or not this slide should be displayed.
  get active() {
    if (!this._active) {
      return false;
    }

    if (
      this._starts !== null &&
      moment(
        this.slides.manager.get("WWSUMeta")
          ? this.slides.manager.get("WWSUMeta").meta.time
          : undefined
      ).isBefore(moment(this._starts))
    ) {
      return false;
    }

    if (
      this._expires !== null &&
      moment(
        this.slides.manager.get("WWSUMeta")
          ? this.slides.manager.get("WWSUMeta").meta.time
          : undefined
      ).isAfter(moment(this._expires))
    ) {
      return false;
    }

    return true;
  }

  // Set manually whether or not to make the slide active, and update all slides.
  set active(value) {
    this._active = value;
    this.slides.updateSidebar();
  }

  // Determine whether to hard-set display: none
  set visible(value) {
    $(`#section-slide-${this._name}`).css("display", value ? "inline" : "none");
  }

  // Set the ISO start date/time for the slide.
  set starts(value) {
    this._starts = value;
    this.slides.updateSidebar();
  }

  // Set the ISO string expires time for the slide.
  set expires(value) {
    this._expires = value;
    this.slides.updateSidebar();
  }

  get html() {
    return this._html;
  }

  // Set new HTML for the slide and update it.
  set html(value) {
    this._html = value;
    $(`#section-slide-${this._name}`).html(
      `<div id="section-slide-${this._name}-contents">${value}</div>`
    );
  }

  get originalHtml() {
    return this._originalHtml;
  }

  // Set new original HTML (when reset = true)
  set originalHtml(value) {
    this._originalHtml = value;
  }

  get transitionIn() {
    return this._transitionIn;
  }

  get transitionOut() {
    return this._transitionOut;
  }

  get displayTime() {
    return this._displayTime;
  }

  set displayTime(value) {
    this._displayTime = value;
  }

  get fitContent() {
    return this._fitContent;
  }

  fnStart() {
    return this._fnStart(this);
  }

  fnEnd() {
    return this._fnEnd(this);
  }

  /**
   * Transition the slide in
   *
   * @param {?function} cb Callback called when the transition is finished.
   */
  transitionIn(cb = () => {}) {
    // Sometimes, animation callback will not fire. Add a 5-second failsafe just in case.
    let failsafe = setTimeout(() => {
      $(`#section-slide-${this._name}-contents`).attr("class", "");
      this.visible = true;
      cb();
    }, 5000);

    // Reset all classes
    $(`#section-slide-${this._name}-contents`).attr("class", "");

    // Mark visible
    this.visible = true;

    // Perform animate.css transition
    $(`#section-slide-${this._name}-contents`).animateCss(
      this._transitionIn,
      () => {
        clearTimeout(failsafe); // Disable failsafe timer
        cb();
      }
    );
  }

  /**
   * Transition the slide out
   *
   * @param {?function} cb Callback executed when the slide is finished transitioning out
   */
  transitionOut(cb) {
    // Sometimes, animation callback will not fire. Add a 5-second failsafe just in case, and hard-set visibility to none.
    let failsafe = setTimeout(() => {
      $(`#section-slide-${this._name}-contents`).attr("class", "");
      this.visible = false;
      cb();
    }, 5000);

    // Do the transition out
    $(`#section-slide-${this._name}-contents`).animateCss(
      this._transitionOut,
      () => {
        clearTimeout(failsafe); // Disable failsafe timer
        this.visible = false; // Invisible now
        $(`#section-slide-${this._name}-contents`).attr("class", ""); // Remove animation classes
        cb();
      }
    );
  }
}

// Ticker class for managing a single ticker
// DO NOT use this class directly; use the WWSUSlides instead.
class WWSUticker {
  /**
   * Create a slide.
   *
   * @param {WWSUslides} slides The WWSUslides that added this ticker
   * @param {object} options Initial options. See constructor for properties.
   */
  constructor(slides, options = {}) {
    this.slides = slides;

    this._name = options.name || ""; // Unique name (DOM ID) assigned to the ticker
    this._category = options.category || ""; // The category to assign this ticker (DOM)
    this._isSticky = options.isSticky || false; // If true, all non-sticky tickers will be hidden as long as one sticky ticker is present
    this._classes = options.classes || "secondary"; // Class(es) for the footer of the ticker when this ticker is displayed
    this._flashClasses = options.flashClasses || false; // If true, the classes will toggle between empty and this._classes every second (for flashing)
    this._active =
      typeof options.active !== `undefined` ? options.active : true; // Whether or not to display this ticker
    this._starts = options.starts || null; // Date/time to start showing this ticker
    this._expires = options.expires || null; // Date/time to stop showing this ticker
    this._originalHtml = options.html || ``; // Original HTML contents of this ticker
    this._html = options.html || ``; // Current HTML contents of this ticker
    this._reset = options.reset || false; // If true, reset the ticker's HTML content to the original whenever it is displayed
    this._transitionIn = options.transitionIn || "slideInUp"; // Animate.css animation class when the ticker appears
    this._transitionOut = options.transitionOut || "slideOutUp"; // Animate.css animation class when the ticker disappears
    this._displayTime = options.displayTime || 7; // Number of seconds the ticker should be displayed. Ignored if marquee is true.
    this._marquee = options.marquee || false; // Display ticker as a marquee instead of a static text for displayTime seconds.
    this._fnStart = options.fnStart || (() => {}); // Callback executed when the ticker is first displayed. Passes the ticker as a parameter.
    this._fnEnd = options.fnEnd || (() => {}); // Callback executed when the ticker is ending (ran out of displayTime). Passes the ticker as a parameter.

    // Create the HTML section for the contents
    $(`${this.slides.options.ticker}`).append(`
    <div id="ticker-${this._name}">
      <div id="ticker-${this._name}-contents" class="${
      this._marquee ? `marquee` : ``
    }">${this._html}</div>
    </div>
    `);
  }

  get name() {
    return this._name;
  }

  get category() {
    return this._category;
  }

  get isSticky() {
    return this._isSticky;
  }

  // Changes whether or not this slide is sticky, and updates all slides.
  set isSticky(value) {
    this._isSticky = value;
    this.slides.updateTickers();
  }

  get classes() {
    return this._classes;
  }

  set classes(value) {
    this._classes = value;
  }

  get flashClasses() {
    return this._flashClasses;
  }

  set flashClasses(value) {
    this._flashClasses = value;
  }

  get reset() {
    return this._reset;
  }

  // Set whether or not this slide should reset to original HTML upon visible. Also, if true, perform the reset.
  set reset(value) {
    this._reset = value;
    if (value) {
      $(`#ticker-${this._name}`).html(
        `<div id="ticker-${this._name}-contents" class="${
          this._marquee ? `marquee` : ``
        }">${this._originalHtml}</div>`
      );
    }
  }

  // Determine whether or not this slide should be displayed.
  get active() {
    if (!this._active) {
      return false;
    }

    if (
      this._starts !== null &&
      moment(
        this.slides.manager.get("WWSUMeta")
          ? this.slides.manager.get("WWSUMeta").meta.time
          : undefined
      ).isBefore(moment(this._starts))
    ) {
      return false;
    }

    if (
      this._expires !== null &&
      moment(
        this.slides.manager.get("WWSUMeta")
          ? this.slides.manager.get("WWSUMeta").meta.time
          : undefined
      ).isAfter(moment(this._expires))
    ) {
      return false;
    }

    return true;
  }

  // Set manually whether or not to make the slide active, and update all slides.
  set active(value) {
    this._active = value;
    this.slides.updateTickers();
  }

  // Determine whether to hard-set display: none
  set visible(value) {
    $(`#ticker-${this._name}`).css("display", value ? "inline" : "none");
  }

  // Set the ISO start date/time for the slide.
  set starts(value) {
    this._starts = value;
    this.slides.updateTickers();
  }

  // Set the ISO string expires time for the slide.
  set expires(value) {
    this._expires = value;
    this.slides.updateTickers();
  }

  get html() {
    return this._html;
  }

  // Set new HTML for the slide and update it.
  set html(value) {
    this._html = value;
    $(`#ticker-${this._name}`).html(
      `<div id="ticker-${this._name}-contents" class="${
        this._marquee ? `marquee` : ``
      }">${value}</div>`
    );
  }

  get originalHtml() {
    return this._originalHtml;
  }

  // Set new original HTML (when reset = true)
  set originalHtml(value) {
    this._originalHtml = value;
  }

  get transitionIn() {
    return this._transitionIn;
  }

  get transitionOut() {
    return this._transitionOut;
  }

  get displayTime() {
    return this._displayTime;
  }

  set displayTime(value) {
    this._displayTime = value;
  }

  get marquee() {
    return this._marquee;
  }

  fnStart() {
    return this._fnStart(this);
  }

  fnEnd() {
    return this._fnEnd(this);
  }

  /**
   * Transition the slide in
   *
   * @param {?function} cb Callback called when the transition is finished.
   */
  transitionIn(cb = () => {}) {
    // Sometimes, animation callback will not fire. Add a 5-second failsafe just in case.
    let failsafe = setTimeout(() => {
      $(`#ticker-${this._name}-contents`).attr("class", "");
      this.visible = true;
      cb();
    }, 5000);

    // Reset all classes
    $(`#ticker-${this._name}-contents`).attr("class", "");
    $(`${this.slides.options.ticker}`).attr("class", this._classes);

    // Mark visible
    this.visible = true;

    // Flash effects (on 750ms, off 250ms)
    if (this.flashClasses) {
      let flashClassOn = 1;
      clearInterval(this.flashClassesTimer);
      this.flashClassesTimer = setInterval(() => {
        flashClassOn++;
        if (flashClassOn > 3) flashClassOn = 0;
        if (this.name === this.slides.tickerActive) {
          $(`${this.slides.options.ticker}`).attr(
            "class",
            flashClassOn > 0 ? this.classes : ""
          );
        } else {
          clearInterval(this.flashClassesTimer);
        }
      }, 250);
    }

    // No transition for marquees
    if (this.marquee) {
      clearTimeout(failsafe); // Disable failsafe timer
      this._initMarquee();
      cb();
      return;
    }

    // Perform animate.css transition
    $(`#ticker-${this._name}-contents`).animateCss(this._transitionIn, () => {
      clearTimeout(failsafe); // Disable failsafe timer
      this._initMarquee();
      cb();
    });
  }

  /**
   * Transition the slide out
   *
   * @param {?function} cb Callback executed when the slide is finished transitioning out
   */
  transitionOut(cb) {
    // Sometimes, animation callback will not fire. Add a 5-second failsafe just in case, and hard-set visibility to none.
    let failsafe = setTimeout(() => {
      $(`#ticker-${this._name}-contents`).attr("class", "");
      this.visible = false;
      clearInterval(this.flashClassesTimer);
      cb();
    }, 5000);

    // No transition for marquees
    if (this.marquee) {
      clearTimeout(failsafe); // Disable failsafe timer
      clearInterval(this.flashClassesTimer);
      cb();
      return;
    }

    // Do the transition out
    $(`#ticker-${this._name}-contents`).animateCss(this._transitionOut, () => {
      clearTimeout(failsafe); // Disable failsafe timer
      clearInterval(this.flashClassesTimer);
      this.visible = false; // Invisible now
      $(`#ticker-${this._name}-contents`).attr("class", ""); // Remove animation classes
      cb();
    });
  }

  // Function to initialize the marquee for the ticker. Should only be called within the class itself.
  _initMarquee() {
    if (!this.marquee) return;

    // Destroy the original marquee just in case
    $(`#ticker-${this._name}-contents`).marquee("destroy");

    $(`#ticker-${this._name}-contents`)
      .bind("finished", () => {
        try {
          $(`#ticker-${this._name}-contents`).marquee("destroy");
          this.visible = false;
          this.slides.tickerTimeLeft = 0;
        } catch (e) {
          console.error(e);
          this.slides.tickerTimeLeft = 0;
        }
      })
      .marquee({
        // duration in milliseconds of the marquee
        speed: 150,
        // gap in pixels between the tickers
        gap: 3000,
        // time in milliseconds before the marquee will start animating
        delayBeforeStart: 250,
        // 'left' or 'right'
        direction: "left",
        // true or false - should the marquee be duplicated to show an effect of continues flow
        duplicated: false,
      });
  }
}
