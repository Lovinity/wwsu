(function (root, factory) {
    if (typeof exports === 'object') {
        module.exports = factory(require('animator'), require('crel'), require('stylar'));
    } else if (typeof define === 'function' && define.amd) {
        define(['animator', 'crel', 'stylar'], factory);
    } else {
        root.marquee = factory(root.animator, root.crel, root.stylar);
    }
}(this, function(animator, crel, stylar){

    function manifestUnicorn(el, options) {
        // create a canvas for the el
        var opts = options || {},
            css = getComputedStyle(el),
            container = crel('div', { class: el.className }),
            width = parseFloat(css.width),
            textValue,
            textElements,
            propName, propValue,
            xPos = 0,
            nextIncrementTick = 0,
            speed = (opts.speed || 1000) / 1000;

        // extract the properties that need to be set
        for (propName in css) {
            propValue = css.getPropertyCSSValue(propName);

            if (propValue) {
                container.style[propName] = propValue.cssText;
            }
        }

        container.style.position = 'relative';
        container._original = el;

        textValue = (el.innerText || el.textContent);
        textElements = [
            crel('span', textValue),
            crel('span', textValue)
        ];

        // initialise the text elements
        textElements.forEach(function(text, index) {
            text.style.font = [
                css.fontVariant,
                css.fontWeight,
                css.fontSize,
                css.fontFamily
            ].join(' ');

            text.style.position = 'absolute';
            text.style.left = '0px';
            text.style.top = '0px';
            text.style.width = width + 'px';

            container.appendChild(text);
        });

        container._animation = animator(function(tick) {
            // update the xposition of the text
            stylar(textElements[0], 'transform', 'translateX(' + xPos + 'px) translateZ(0)');
            stylar(textElements[1], 'transform', 'translateX(' + (xPos + width) + 'px) translateZ(0)');

            // increment the xpos
            if (tick > nextIncrementTick) {
                xPos -= speed;
            }

            if (xPos < -width) {
                xPos = 0;

                // if we have a freeze time then wait
                if (opts.freezeDelay) {
                    nextIncrementTick = tick + opts.freezeDelay;
                }
            }
        });        

        /*
            newEl = crel(css.display.slice(0, 6) === 'inline' ? 'span' : 'div'),
            canvas = document.createElement('canvas'),
            context = canvas.getContext('2d'),
            width = canvas.width = parseFloat(css.width),
            height = canvas.height = parseFloat(css.height),
            speed = (opts.speed || 1000) / 1000,
            xPos = 0,
            nextIncrementTick = 0,
            metrics;

        context.font = [
            css.fontVariant,
            css.fontWeight,
            css.fontSize,
            css.fontFamily
        ].join(' ');

        context.fillStyle = css.color;
        context.textBaseline = 'middle';

        // if we need to check the overflow, then measure the text
        if (opts.checkOverflow) {
            metrics = context.measureText(el.innerText);

            // if the width 
            if (metrics.width < width) return;
        }

        // save the original node
        canvas._original = el;

        // create the animation
        canvas._animation = animator(function(tick) {
            var text = el.innerText;

            context.clearRect(0, 0, width, height);

            // draw the two marquee sections
            context.fillText(text, xPos, height / 2);
            context.fillText(text, xPos + width, height / 2);

            // increment the xpos
            if (tick > nextIncrementTick) {
                xPos -= speed;
            }

            if (xPos < -width) {
                xPos = 0;

                // if we have a freeze time then wait
                if (opts.freezeDelay) {
                    nextIncrementTick = tick + opts.freezeDelay;
                }
            }
        });
        */

        // add the canvas
        el.parentNode.insertBefore(container, el);

        // remove the element from the dom
        el.parentNode.removeChild(el);

        return container;
    }

    function marquee(targets, opts) {
        var items;

        function restoreItems() {
            items.forEach(function(canvas) {
                if (canvas) {
                    // stop the animation
                    canvas._animation.stop();

                    canvas.parentNode.insertBefore(canvas._original, canvas);
                    canvas.parentNode.removeChild(canvas);
                }
            });
        }

        // if the target is a string, then get qsa that puppy
        if (typeof targets == 'string' || (targets instanceof String)) {
            targets = [].slice.call(document.querySelectorAll(targets));
        }

        // ensure we have an array for targets
        targets = [].concat(targets || []);

        // iterate through the targets and make magic happen
        items = targets.map(function(target) {
            return manifestUnicorn(target, opts);
        });

        return {
            items: items, 
            stop:  restoreItems
        };
    }

    return marquee;
}));