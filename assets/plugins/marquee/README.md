# marquee

Marquee all the things!  

First, start by adding elements to your page.  Just like any other normal day:

```html
<h1>This is a test</h1>
```

Then, make everything better with marquee:

```js
marquee('h1');
```

There are some configuration options also:

```js
// initialise the speed
marquee('h1', { 
    speed: 250, // default speed = 1000, set speed to 4x
    freezeDelay: 1000 // freeze for a second once one marquee iteration is complete
});
```

Also, `marquee` can detect whether the text fits in it's container using the [measureText](http://www.w3.org/TR/2dcontext/#dom-context-2d-measuretext) for the canvas 2D context:

```js
// only make a marquee if the text overflows
marque('h1', {
    checkOverflow: true
});
```

## Implementations

Initial implementation was done using Canvas 2D Text, but looked crap on High Density Devices. Has been dropped back to a simple DOM implementation for the moment.

## License

MIT: <http://damonoehlman.mit-license.org/>