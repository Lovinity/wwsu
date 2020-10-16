var marquee = require('../'),
    animations = [];

window.addEventListener('load', function() {
    animations.push(marquee('h1', { speed: 500 } ));
    animations.push(marquee('h2', { checkOverflow: true } ));
    animations.push(marquee('h3', { speed: 3000, freezeDelay: 4000 } ));
});