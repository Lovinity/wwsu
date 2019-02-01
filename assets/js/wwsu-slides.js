// Slide class for managing a single slide
class Slide {
    constructor(data = {}) {
        this._name = data.name || "";
        this._label = data.label || "";
        this._weight = data.weight || 0;
        this._isSticky = data.isSticky || false;
        this._color = data.color || "secondary";
        this._active = data.active || true;
        this._starts = data.starts || null;
        this._expires = data.expires || null;
        this._html = `<div id="slide-${this._name}" style="display: none; width: 100%;"><div id="content-slide-${this._name}">${data.html || ``}</div></div>`;
        this._transitionIn = data.transitionIn || "fadeIn";
        this._transitionOut = data.transitionOut || "fadeOut";
        this._displayTime = data.displayTime || 14;
        this._fitContent = data.fitContent || false;

        var temp = document.getElementById(`slides`);
        if (temp)
            temp.innerHTML += this._html;
    }

    get name() {
        return this._name;
    }

    get label() {
        return this._label;
    }

    set label(value) {
        this._label = value;
        Slides.updateBadges();
    }

    get weight() {
        return this._weight;
    }

    set weight(value) {
        this._weight = value;
        Slides.updateBadges();
    }

    get isSticky() {
        return this._isSticky;
    }

    set isSticky(value) {
        this._isSticky = value;
        Slides.updateBadges();
    }

    get color() {
        return this._color;
    }

    set color(value) {
        this._color = value;
    }

    get active() {
        if (!this._active)
            return false;

        if (this._starts !== null && moment(Meta.time).isBefore(moment(this._starts)))
            return false;

        if (this._expires !== null && moment(Meta.time).isAfter(moment(this._expires)))
            return false;

        return true;
    }

    set active(value) {
        this._active = value;
        Slides.updateBadges();
    }

    set starts(value) {
        this._starts = value;
        Slides.updateBadges();
    }

    set expires(value) {
        this._expires = value;
        Slides.updateBadges();
    }

    get html() {
        return this._html;
    }

    set html(value) {
        if (Slides.activeSlide().name === this._name)
        {
            this._html = `<div id="slide-${this._name}" style="display: inline; width: 100%;"><div id="content-slide-${this._name}">${value}</div></div>`;
        } else {
            this._html = `<div id="slide-${this._name}" style="display: none; width: 100%;"><div id="content-slide-${this._name}">${value}</div></div>`;
        }
        var temp = document.getElementById(`slide-${this._name}`);
        if (temp)
            temp.innerHTML = value;
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

    remove() {
        var temp = document.getElementById(`slide-${this._name}`);
        if (temp)
            temp.parentNode.removeChild(temp);
    }
}

// Slides factory function for containing all of the slides for this display sign
var Slides = (() => {

    // Storage of slides in the system
    var slides = [];

    // slides index of the currently active slide
    var currentSlide = -1;

    // Used to count down how much time is left on the slide currently being displayed.
    var timeLeft = 0;

    // Return the Slide class of the currently active slide
    const activeSlide = (() => slides[currentSlide] || {});

    // Return the Slide class of the provided slide name
    const slide = ((slideName) => {
        return slides.filter((_slide) => _slide.name === slideName)[0];
    });

    const allSlides = (() => slides);

    // function to update the order of the slides array by weight, and update the badges at the bottom of the screen for the slides
    const updateBadges = (() => {

        // First, sort the current slides array depending on each slide's weight... highest to lowest.
        var compare = function (a, b) {
            try {
                if (a.weight > b.weight)
                    return -1;
                if (a.weight < b.weight)
                    return 1;
                return 0;
            } catch (e) {
                console.error(e);
                iziToast.show({
                    title: 'An error occurred - Please check the logs',
                    message: `Error occurred in the compare function of Slides.updateBadges`
                });
            }
        };

        slides = slides.sort(compare);

        // Update the badges at the bottom of the screen for each slide
        var temp = document.getElementById(`slide-badges`);
        if (temp)
        {
            temp.innerHTML = ``;
            var stickyOnly = slides.filter((_slides) => _slides.isSticky).length > 0;
            var _slides = [];
            if (stickyOnly)
            {
                _slides = slides.filter((_slides) => _slides.active && _slides.isSticky);
                if (!activeSlide().active || !activeSlide().isSticky)
                    timeLeft = 0;
            } else {
                _slides = slides.filter((_slides) => _slides.active);
                if (!activeSlide().active)
                    timeLeft = 0;
            }

            var html = ``;
            _slides.map((_slide) => {
                html += `<span class="m-1 chip shadow-4 ${typeof slides[currentSlide] !== `undefined` && _slide.name === slides[currentSlide].name ? `bg-light-1` : `bg-dark-4`}"><i class="chip-icon bg-${_slide.color}">${typeof slides[currentSlide] !== `undefined` && _slide.name === slides[currentSlide].name && timeLeft !== null ? timeLeft : ``}</i>${_slide.label}</span>`;
            });

            temp.innerHTML = html;
        }
    });

    // Add a Slide class into the system
    const newSlide = ((data) => {
        slides.push(new Slide(data));
        updateBadges();
    });

    // Remove a slide from the system by slide name
    const removeSlide = ((slideName) => {
        slides.map((_slide, index) => {
            if (_slide.name === slideName)
            {
                _slide.remove();
                delete slides[index];
                if (index === currentSlide)
                {
                    timeLeft = 0;
                }
            }
        });
        updateBadges();
    });

    // Transition to a slide
    const showSlide = ((slideName) => {
        timeLeft = null;
        if (slideName !== activeSlide().name)
        {
            // Executed when we are ready to show the slide
            var afterFunction = () => {

                // Find out what index the slide we're about to display is
                var iteration = 0;
                var done = false;
                while (!done)
                {
                    if (slides[iteration].name === slideName)
                    {
                        done = true;
                        currentSlide = iteration;
                    }
                    iteration++;

                    // Should never happen, but failsafe to prevent freezes
                    if (iteration > slides.length)
                    {
                        done = true;
                        timeLeft = 0;
                        currentSlide = -1;
                        return null;
                    }
                }

                // Show the slide
                var temp = document.getElementById(`slide-${activeSlide().name}`);
                if (temp)
                    temp.style.display = "inline";
                $(`#content-slide-${activeSlide().name}`).animateCss(activeSlide().transitionIn, () => {});

                timeLeft = activeSlide().displayTime;
                updateBadges();

                // Fit content if necessary
                var temp2 = document.getElementById(`content-slide-${activeSlide().name}`);
                if (activeSlide().fitContent && temp && temp2)
                {

                    temp.classList.add("scale-wrapper");
                    temp2.classList.add("scale-content");
                    var pageWidth, pageHeight;

                    var basePage = {
                        width: 1600,
                        height: 900,
                        scale: 1,
                        scaleX: 1,
                        scaleY: 1
                    };

                    $(() => {
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
                        }

                        function scalePages(page, maxWidth, maxHeight) {
                            page.attr("width", `${(($(`#content-slide-${activeSlide().name}`).height() / maxHeight) * 80)}%`);
                            var scaleX = 1, scaleY = 1;
                            scaleX = (maxWidth / $(`#content-slide-${activeSlide().name}`).width()) * 0.95;
                            scaleY = (maxHeight / $(`#content-slide-${activeSlide().name}`).height()) * 0.80;
                            basePage.scaleX = scaleX;
                            basePage.scaleY = scaleY;
                            basePage.scale = (scaleX > scaleY) ? scaleY : scaleX;

                            var newLeftPos = Math.abs(Math.floor((($(`#content-slide-${activeSlide().name}`).width() * basePage.scale) - maxWidth) / 2));
                            var newTopPos = Math.abs(Math.floor((($(`#content-slide-${activeSlide().name}`).height() * basePage.scale) - maxHeight) / 2));

                            page.attr('style', '-webkit-transform:scale(' + basePage.scale + ');left:' + newLeftPos + 'px;top:0px;');
                        }
                    });
                }
            };

            // Process transitioning out of the current slide
            if (currentSlide > -1)
            {
                $(`#content-slide-${activeSlide().name}`).animateCss(activeSlide().transitionOut, () => {
                    var temp = document.getElementById(`slide-${activeSlide().name}`);
                    if (temp)
                        temp.style.display = "none";

                    afterFunction();
                });
            } else {
                afterFunction();
            }
        } else {
            timeLeft = activeSlide().displayTime;
            updateBadges();
        }
    });

    const generateBG = () => {

        var hexValues = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e"];

        function populate(a) {
            for (var i = 0; i < 6; i++) {
                var x = Math.round(Math.random() * 14);
                var y = hexValues[x];
                a += y;
            }
            return a;
        }

        var newColor1 = populate('#');
        var newColor2 = populate('#');
        var angle = Math.round(Math.random() * 360);

        var gradient = "linear-gradient(" + angle + "deg, " + newColor1 + ", " + newColor2 + ")";

        var temp = document.getElementById("bg-canvas");
        if (temp)
            temp.style.background = gradient;

    }

    // Timer for controlling transitions between slides
    var timer = setInterval(() => {
        if (timeLeft !== null)
        {
            timeLeft--;

            if (timeLeft <= 0)
            {
                timeLeft = 0;

                // Determine which slides qualify to be displayed
                var stickyOnly = slides.filter((_slides) => _slides.isSticky).length > 0;
                var activeIndexes = [];
                if (stickyOnly)
                {
                    activeIndexes = slides.map((_slides, index) => _slides.active && _slides.isSticky);
                } else {
                    activeIndexes = slides.map((_slides, index) => _slides.active);
                }

                // Determine based on the above which slide we should show next
                var qualified = activeIndexes.filter((value, index) => index > currentSlide && value);
                if (qualified.length <= 0)
                {
                    generateBG();
                    qualified = activeIndexes.filter((value, index) => value);
                    if (qualified.length > 0)
                    {
                        var done = false;
                        var iteration = 0;
                        while (!done)
                        {
                            if (activeIndexes[iteration]) {
                                done = true;
                                showSlide(slides[iteration].name);
                            }
                            iteration++;

                            // Should never happen, but failsafe to prevent freezes
                            if (iteration > slides.length)
                            {
                                done = true;
                                currentSlide = -1;
                                timeLeft = 0;
                            }
                        }
                    } else {
                        currentSlide = -1;
                        timeLeft = 0;
                    }
                } else {
                    var done = false;
                    var iteration = currentSlide + 1;
                    while (!done)
                    {
                        if (activeIndexes[iteration]) {
                            done = true;
                            showSlide(slides[iteration].name);
                        }
                        iteration++;

                        // Should never happen, but failsafe to prevent freezes
                        if (iteration > slides.length)
                        {
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

    // Return the stuff
    return {updateBadges, activeSlide, slide, allSlides, newSlide, removeSlide, showSlide};
})();

