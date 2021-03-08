/* global moment, iziToast, $ */

// Slide class for managing a single slide
// DO NOT use this class directly; use the slides factory function instead.
class WWSUslide {
  /**
   * Create a slide.
   *
   * @param {WWSUmodules} manager WWSU modules class managing WWSU modules
   * @param {object} data Initial slide data. See constructor for properties.
   */
  constructor(manager, data = {}) {
    this._name = data.name || "";
    this._label = data.label || "";
    this._weight = data.weight || 0;
    this._isSticky = data.isSticky || false;
    this._color = data.color || "secondary";
    this._active = typeof data.active !== `undefined` ? data.active : true;
    this._starts = data.starts || null;
    this._expires = data.expires || null;
    this._html = `<div id="slide-${
      this._name
    }" style="display: none; width: 100%;"><div id="content-slide-${
      this._name
    }">${data.html || ``}</div></div>`;
    this._innerHtml = data.html || ``;
    this._reset = data.reset || false;
    this._transitionIn = data.transitionIn || "fadeIn";
    this._transitionOut = data.transitionOut || "fadeOut";
    this._displayTime = data.displayTime || 14;
    this._fitContent = data.fitContent || false;
    this._fnStart = data.fnStart || (() => {});
    this._fnEnd = data.fnEnd || (() => {});

    this.manager = manager;

    var temp = document.getElementById(`slides`);
    if (temp !== null) {
      temp.innerHTML += this._html;
    }
  }

  get name() {
    return this._name;
  }

  get label() {
    return this._label;
  }

  // Sets a new label for the slide and updates all slides.
  set label(value) {
    this._label = value;
    WWSUslides.updateBadges();
  }

  get weight() {
    return this._weight;
  }

  // Sets a new weight / order for the slide and updates all slides.
  set weight(value) {
    this._weight = value;
    WWSUslides.updateBadges();
  }

  get isSticky() {
    return this._isSticky;
  }

  // Changes whether or not this slide is sticky, and updates all slides.
  set isSticky(value) {
    this._isSticky = value;
    WWSUslides.updateBadges();
  }

  get color() {
    return this._color;
  }

  set color(value) {
    this._color = value;
  }

  get reset() {
    return this._reset;
  }

  // Determine whether or not this slide should be displayed.
  get active() {
    if (!this._active) {
      return false;
    }

    if (
      this._starts !== null &&
      moment(
        this.manager.get("WWSUMeta")
          ? this.manager.get("WWSUMeta").meta.time
          : undefined
      ).isBefore(moment(this._starts))
    ) {
      return false;
    }

    if (
      this._expires !== null &&
      moment(
        this.manager.get("WWSUMeta")
          ? this.manager.get("WWSUMeta").meta.time
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
    WWSUslides.updateBadges();
  }

  // Set the ISO start date/time for the slide.
  set starts(value) {
    this._starts = value;
    WWSUslides.updateBadges();
  }

  // Set the ISO string expires time for the slide.
  set expires(value) {
    this._expires = value;
    WWSUslides.updateBadges();
  }

  get html() {
    return this._html;
  }

  get innerHtml() {
    return this._innerHtml;
  }

  // Set new HTML for the slide and update it.
  set html(value) {
    this._innerHtml = value;
    if (WWSUslides.activeSlide().name === this._name) {
      this._html = `<div id="slide-${this._name}" style="display: inline; width: 100%;"><div id="content-slide-${this._name}">${value}</div></div>`;
      var temp = document.getElementById(`content-slide-${this._name}`);
      if (temp !== null) {
        temp.innerHTML = value;
      }
      WWSUslides.showSlide(this._name);
    } else {
      this._html = `<div id="slide-${this._name}" style="display: none; width: 100%;"><div id="content-slide-${this._name}">${value}</div></div>`;
      var temp = document.getElementById(`content-slide-${this._name}`);
      if (temp !== null) {
        temp.innerHTML = value;
      }
    }
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

  // Destroy the slide
  remove() {
    var temp = document.getElementById(`slide-${this._name}`);
    if (temp !== null) {
      temp.parentNode.removeChild(temp);
    }
  }
}

/**
 * Slides factory function for creating a slide manager.
 * @param {WWSUmodules} manager The WWSU modules class
 * @returns {object} Object of functions for managing slides.
 */
WWSUslides = (manager) => {
  // Storage of slides in the system
  var slides = [];

  // slides index of the currently active slide
  var currentSlide = -1;

  // Used to count down how much time is left on the slide currently being displayed.
  var timeLeft = 0;

  // Return the Slide class of the currently active slide
  const activeSlide = () => slides[currentSlide] || {};

  // Return the number of currently active slides
  const countActive = () => {
    try {
      var temp = slides.filter((_slides) => _slides.active);
      return temp.length || 0;
    } catch (eee) {
      return 0;
    }
  };

  /**
   * Get a slide by its name.
   *
   * @param {string} slideName Name of the slide to fetch
   * @returns {object} The slide if it exists
   */
  const slide = (slideName) => {
    return slides.filter((_slide) => _slide.name === slideName)[0];
  };

  /**
   * Return all slides
   */
  const allSlides = () => slides;

  // function to update the order of the slides array by weight, and update the badges at the bottom of the screen for the slides
  const updateBadges = () => {
    // First, sort the current slides array depending on each slide's weight... highest to lowest.
    var compare = function (a, b) {
      try {
        if (a.weight > b.weight) {
          return -1;
        }
        if (a.weight < b.weight) {
          return 1;
        }
        return 0;
      } catch (e) {
        console.error(e);
        iziToast.show({
          title: "An error occurred - Please check the logs",
          message: `Error occurred in the compare function of Slides.updateBadges`,
        });
      }
    };

    slides = slides.sort(compare);

    // Update the badges at the bottom of the screen for each slide
    var temp = document.getElementById(`slide-badges`);
    if (temp !== null) {
      temp.innerHTML = ``;
      var stickyOnly =
        slides.filter((_slides) => _slides.isSticky && _slides.active).length >
        0;
      var _slides = [];
      if (stickyOnly) {
        _slides = slides.filter(
          (_slides) => _slides.active && _slides.isSticky
        );
        if (!activeSlide().active || !activeSlide().isSticky) {
          timeLeft = 0;
        }
      } else {
        _slides = slides.filter((_slides) => _slides.active);
        if (!activeSlide().active) {
          timeLeft = 0;
        }
      }

      var html = ``;
      _slides.map((_slide) => {
        html += `<span class="m-1 chip shadow-4 ${
          typeof slides[currentSlide] !== `undefined` &&
          _slide.name === slides[currentSlide].name
            ? `bg-light-1 text-dark`
            : `bg-dark-4 text-white`
        }"><i class="chip-icon bg-${_slide.color} ${
          _slide.color === `warning` ||
          _slide.color === `info` ||
          _slide.color === `success` ||
          _slide.color === `urgent`
            ? `text-dark`
            : `text-white`
        }">${
          typeof slides[currentSlide] !== `undefined` &&
          _slide.name === slides[currentSlide].name &&
          timeLeft !== null &&
          _slides.length > 1
            ? timeLeft
            : ``
        }</i>${_slide.label}</span>`;
      });

      temp.innerHTML = html;
    }
  };

  /**
   * Add a new slide.
   *
   * @param {object} data Slide data. See Slides class constructor for properties.
   */
  const newSlide = (data) => {
    // Check if the slide already exists
    var changed = false;
    slides
      .filter((slide) => slide && slide.name === data.name)
      .map((slide, index) => {
        changed = true;
        slides[index].remove();
        slides[index] = new WWSUslide(manager, data);
        updateBadges();
      });
    if (!changed) {
      slides.push(new WWSUslide(manager, data));
      updateBadges();
    }
  };

  /**
   * Remove a slide.
   *
   * @param {string} slideName Name of slide to destroy.
   */
  const removeSlide = (slideName) => {
    slides.map((_slide, index) => {
      if (_slide.name === slideName) {
        if (index === currentSlide) {
          currentSlide = -1;
          timeLeft = 0;
        }
        _slide.remove();
        slides.splice(index, 1);
      }
    });
    updateBadges();
  };

  /**
   * Transition to / show a slide.
   *
   * @param {string} slideName Name of slide to show
   */
  const showSlide = (slideName) => {
    timeLeft = null;
    if (activeSlide().fnEnd) {
      activeSlide().fnEnd();
    }
    if (slideName !== activeSlide().name) {
      console.log(`Different slide.`);
      // Executed when we are ready to show the slide
      var afterFunction = () => {
        console.log(`afterFunction executed`);

        // Find out what index the slide we're about to display is
        var iteration = 0;
        var done = false;
        while (!done) {
          if (slides[iteration].name === slideName) {
            done = true;
            currentSlide = iteration;
            console.log(`currentSlide set to ${iteration}`);
          }
          iteration++;

          // Should never happen, but failsafe to prevent freezes
          if (iteration > slides.length) {
            console.log(`Exceeded iteration count`);
            done = true;
            timeLeft = 0;
            currentSlide = -1;
            return null;
          }
        }

        // Update inner html to configured value in case fn changed it.
        console.log(`showing slide`);
        var temp2 = document.getElementById(
          `content-slide-${activeSlide().name}`
        );
        if (temp2 !== null) {
          if (activeSlide().reset) {
            temp2.innerHTML = activeSlide().innerHtml;
          }
        }

        // Failsafe: iterate through all slides and set display to none to prevent stray slides from remaining visible
        slides.map((_slide) => {
          var temp = document.getElementById(`slide-${_slide.name}`);
          if (temp !== null) {
            temp.style.display = "none";
          }
        });

        // Display active slide
        var temp = document.getElementById(`slide-${activeSlide().name}`);
        if (temp !== null) {
          temp.style.display = "inline";
        }

        // Reset animation classes
        if (temp2 !== null) {
          temp2.className = "";
        }

        $(`#content-slide-${activeSlide().name}`).animateCss(
          activeSlide().transitionIn,
          () => {}
        );

        activeSlide().fnStart();

        console.log(`setting time`);
        timeLeft = activeSlide().displayTime;
        updateBadges();
        fitContent();
      };

      // Process transitioning out of the current slide
      if (currentSlide > -1) {
        console.log(`transition out`);
        var temp = document.getElementById(`slide-${activeSlide().name}`);
        if (temp !== null) {
          console.log(`slide exists; process animation`);

          // Sometimes, animation callback will not fire. Add a 10-second failsafe just in case.
          var failsafe = setTimeout(() => {
            console.log(`animation failsafe triggered`);
            var temp = document.getElementById(`slide-${activeSlide().name}`);
            if (temp !== null) {
              temp.style.display = "none";
            }
            var temp2 = document.getElementById(
              `content-slide-${activeSlide().name}`
            );
            if (temp2 !== null) {
              temp2.className = "";
            }
            afterFunction();
          }, 5000);

          $(`#content-slide-${activeSlide().name}`).animateCss(
            activeSlide().transitionOut,
            () => {
              console.log(`animation complete`);
              var temp2 = document.getElementById(
                `content-slide-${activeSlide().name}`
              );
              if (temp2 !== null) {
                temp2.className = "";
              }
              var temp = document.getElementById(`slide-${activeSlide().name}`);
              if (temp !== null) {
                temp.style.display = "none";
              }
              clearTimeout(failsafe);
              afterFunction();
            }
          );
        } else {
          console.log(`slide does not exist; do not animate`);
          afterFunction();
        }
      } else {
        console.log(`currentSlide is negative`);
        afterFunction();
      }
    } else {
      console.log(`Same slide; resetting clock`);

      // Show the slide. Update inner html to configured value in case fn changed it.
      console.log(`showing slide`);
      var temp2 = document.getElementById(
        `content-slide-${activeSlide().name}`
      );
      if (temp2 !== null) {
        if (activeSlide().reset) {
          temp2.innerHTML = activeSlide().innerHtml;
        }
      }
      temp = document.getElementById(`slide-${activeSlide().name}`);
      if (temp !== null) {
        temp.style.display = "inline";
      }

      activeSlide().fnStart();
      timeLeft = activeSlide().displayTime;
      updateBadges();
      fitContent();
    }
  };

  // Generate a random gradient background
  const generateBG = () => {
    var hexValues = [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "a",
      "b",
      "c",
      "d",
      "e",
    ];

    function populate(a) {
      for (var i = 0; i < 6; i++) {
        var x = Math.round(Math.random() * 14);
        var y = hexValues[x];
        a += y;
      }
      return a;
    }

    var newColor1 = populate("#");
    var newColor2 = populate("#");
    var angle = Math.round(Math.random() * 360);

    var gradient =
      "linear-gradient(" + angle + "deg, " + newColor1 + ", " + newColor2 + ")";

    var temp = document.getElementById("bg-canvas");
    if (temp !== null) {
      temp.style.background = gradient;
    }
  };

  // Private function for fitting the content of the active slide if the active slide's fitContent = true
  const fitContent = () => {
    // Fit content if necessary
    temp = document.getElementById(`slide-${activeSlide().name}`);
    temp2 = document.getElementById(`content-slide-${activeSlide().name}`);
    console.log(`Clecking fitContent`);
    if (activeSlide().fitContent && temp !== null && temp2 !== null) {
      console.log(`fitting content`);
      temp.classList.add("scale-wrapper");
      temp2.classList.add("scale-content");
      var pageWidth;
      var pageHeight;

      var basePage = {
        width: temp.offsetWidth,
        height: temp.offsetHeight,
        scale: 1,
        scaleX: 1,
        scaleY: 1,
      };

      $(() => {
        console.log(`fitting content self function`);
        var $page = $(`#slide-${activeSlide().name}`);

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
          pageHeight = $(`#slide-${activeSlide().name}`).height();
          pageWidth = $(`#slide-${activeSlide().name}`).width();
          console.log(
            `Page size... height: ${pageHeight}, width: ${pageWidth}`
          );
        }

        function scalePages(page, maxWidth, maxHeight) {
          var width =
            ($(`#content-slide-${activeSlide().name}`).height() / maxHeight) *
            80;
          page.attr("width", `${width}%`);
          console.log(`Page width: ${width}%`);
          var scaleX = 1;
          var scaleY = 1;
          scaleX =
            (maxWidth / $(`#content-slide-${activeSlide().name}`).width()) *
            0.95;
          scaleY =
            (maxHeight / $(`#content-slide-${activeSlide().name}`).height()) *
            0.95;
          basePage.scaleX = scaleX;
          basePage.scaleY = scaleY;
          basePage.scale = scaleX > scaleY ? scaleY : scaleX;
          console.log(
            `Scale: ${basePage.scale}, X: ${basePage.scaleX}, Y: ${basePage.scaleY}`
          );

          var newLeftPos = Math.abs(
            Math.floor(
              ($(`#content-slide-${activeSlide().name}`).width() *
                basePage.scale -
                maxWidth) /
                2
            )
          );
          var newTopPos = Math.abs(
            Math.floor(
              ($(`#content-slide-${activeSlide().name}`).height() *
                basePage.scale -
                maxHeight) /
                2
            )
          );

          console.log(`Left: ${newLeftPos}, Top: ${newTopPos}`);

          $(`#content-slide-${activeSlide().name}`).attr(
            "style",
            "-webkit-transform:scale(" +
              basePage.scale +
              ");left:" +
              newLeftPos +
              "px;top:0px;"
          );
        }
      });
      // Failsafe for fitContent. When it's false, we should always have 1 scale and 100% width.
    } else {
      var $page = $(`#slide-${activeSlide().name}`);
      $page.attr("width", `100%`);
      $(`#content-slide-${activeSlide().name}`).attr(
        "style",
        "-webkit-transform:scale(1);left:0px;top:0px;"
      );
    }
  };

  // Timer for controlling transitions between slides
  setInterval(() => {
    if (timeLeft !== null) {
      timeLeft--;

      if (timeLeft <= 0) {
        timeLeft = 0;
        console.log(`No time`);

        // Determine which slides qualify to be displayed
        var stickyOnly =
          slides.filter((_slides) => _slides.isSticky && _slides.active)
            .length > 0;
        var activeIndexes = [];
        if (stickyOnly) {
          activeIndexes = slides.map(
            (_slides, index) => _slides.active && _slides.isSticky
          );
        } else {
          activeIndexes = slides.map((_slides, index) => _slides.active);
        }

        // Determine based on the above which slide we should show next
        var qualified = activeIndexes.filter(
          (value, index) => index > currentSlide && value
        );
        if (qualified.length <= 0) {
          console.log(`No more slides`);
          generateBG();
          qualified = activeIndexes.filter((value, index) => value);
          if (qualified.length > 0) {
            console.log(`At least 1 qualified slide`);
            var done = false;
            var iteration = 0;
            while (!done) {
              if (activeIndexes[iteration]) {
                console.log(`Qualified ${iteration}`);
                done = true;
                showSlide(slides[iteration].name);
              }
              iteration++;

              // Should never happen, but failsafe to prevent freezes
              if (!done && iteration > slides.length) {
                console.log(`Reached iteration limit`);
                done = true;
                currentSlide = -1;
                timeLeft = 0;
              }
            }
          } else {
            console.log(`No qualified slides`);
            currentSlide = -1;
            timeLeft = 0;
          }
        } else {
          console.log(`Qualified slides after current`);
          done = false;
          iteration = currentSlide + 1;
          while (!done) {
            if (activeIndexes[iteration]) {
              console.log(`Qualified ${iteration}`);
              done = true;
              showSlide(slides[iteration].name);
            }

            iteration++;

            // Should never happen, but failsafe to prevent freezes
            if (!done && iteration > slides.length) {
              console.log(`Reached iteration limit`);
              done = true;
              currentSlide = -1;
              timeLeft = 0;
            }
          }
        }
      }

      updateBadges();
    }
  }, 1000);

  // Return factory functions
  return {
    updateBadges,
    activeSlide,
    countActive,
    slide,
    allSlides,
    newSlide,
    removeSlide,
    showSlide,
  };
};
