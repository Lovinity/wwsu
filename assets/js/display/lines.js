/**
 * lines.js
 * Copyright (c) 2017 Carl Gorringe
 * https://github.com/cgorringe/LinesJS
 **/

if (typeof module !== 'undefined') module.exports = LinesJS;

function LinesJS (my) {

	// public defaults
	if (typeof my === 'undefined') my = {};
	if (!('skipMin'      in my)) my.skipMin      =  5;
	if (!('skipMax'      in my)) my.skipMax      = 15;
	if (!('numLines'     in my)) my.numLines     = 30;
	if (!('timeInterval' in my)) my.timeInterval = 50;
	if (!('lineWidth'    in my)) my.lineWidth    =  1;
	if (!('lineWidthFS'  in my)) my.lineWidthFS  =  2;

	// private vars
	var canvas, bgColor, ctx, timer,
			// line positions
			lx1, ly1, lx2, ly2, idx,
			// skip values
			sx1, sy1, sx2, sy2,
			// line colors
			oldR, oldG, oldB, newR, newG, newB,
			skpR, skpG, skpB, curR, curG, curB, colCount = 0,
			// fullscreen
			fullmode = false, bu = {};

	// private methods
	function randInt(min, max) {
		// note: this is non-uniform
		return Math.floor(Math.random() * (max - min + 1)) + min;
	};
	function randSkip() {
		return randInt(my.skipMin, my.skipMax);
	};

	// public methods
	my.setup = function (canvasId) {
		if (canvasId) {
			canvas = document.getElementById(canvasId);
			bgColor = window.getComputedStyle(canvas, null).getPropertyValue('background-color');
			ctx = canvas.getContext('2d');
			ctx.imageSmoothingEnabled = true;
			lx1 = new Array(my.numLines);
			ly1 = new Array(my.numLines);
			lx2 = new Array(my.numLines);
			ly2 = new Array(my.numLines);
			idx = 0;
			my.clear();
			my.resetLine();
		}
	};

	my.clear = function () {
		if (ctx) {
			ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		}
	};

	my.reset = function () {
		my.resetLine();
		my.eraseLastLine();
	};

	my.resetLine = function () {
		if (ctx) {
			idx++; if (idx >= my.numLines) { idx = 0; }
			// new line positions
			lx1[idx] = randInt(0, ctx.canvas.width);
			ly1[idx] = randInt(0, ctx.canvas.height);
			lx2[idx] = randInt(0, ctx.canvas.width);
			ly2[idx] = randInt(0, ctx.canvas.height);
			// new skip values
			sx1 = (randInt(0,1)) ? randSkip() : -randSkip()
			sy1 = (randInt(0,1)) ? randSkip() : -randSkip()
			sx2 = (randInt(0,1)) ? randSkip() : -randSkip()
			sy2 = (randInt(0,1)) ? randSkip() : -randSkip()
			// new random color
			newR = randInt(0, 1) * 255;
			newG = randInt(0, 1) * 255;
			newB = randInt(0, 1) * 255;
			colCount = 0;
		}
	};

	my.nextLine = function () {
		if (ctx) {
			var old_idx = idx;
			idx++; if (idx >= my.numLines) { idx = 0; }
			// move the line
			lx1[idx] = lx1[old_idx] + sx1;
			ly1[idx] = ly1[old_idx] + sy1;
			lx2[idx] = lx2[old_idx] + sx2;
			ly2[idx] = ly2[old_idx] + sy2;
			// reverse direction if on edge
			if (lx1[idx] < 0) { sx1 = randSkip(); }
			if (lx1[idx] >= ctx.canvas.width) { sx1 = -randSkip(); }
			if (ly1[idx] < 0) { sy1 = randSkip(); }
			if (ly1[idx] >= ctx.canvas.height) { sy1 = -randSkip(); }
			if (lx2[idx] < 0) { sx2 = randSkip(); }
			if (lx2[idx] >= ctx.canvas.width) { sx2 = -randSkip(); }
			if (ly2[idx] < 0) { sy2 = randSkip(); }
			if (ly2[idx] >= ctx.canvas.height) { sy2 = -randSkip(); }
		}
	};

	my.nextColor = function () {
		colCount--;
		if (colCount < 0) {
			colCount = 15;
			oldR = newR; newR = randInt(0, 1) * 255;
			oldG = newG; newG = randInt(0, 1) * 255;
			oldB = newB; newB = randInt(0, 1) * 255;
			skpR = (newR == oldR) ? 0 : ((newR > oldR) ? 16 : -16);
			skpG = (newG == oldG) ? 0 : ((newG > oldG) ? 16 : -16);
			skpB = (newB == oldB) ? 0 : ((newB > oldB) ? 16 : -16);
			curR = oldR; curG = oldG; curB = oldB;
		}
		curR += skpR; curG += skpG; curB += skpB;
		return 'rgb(' + curR + ',' + curG + ',' + curB +')';
	};

	my.drawFourLines = function (x1, y1, x2, y2) {
		if (ctx) {
			ctx.beginPath();
			ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
			ctx.moveTo(ctx.canvas.width - x1, y1); ctx.lineTo(ctx.canvas.width - x2, y2);
			ctx.moveTo(x1, ctx.canvas.height - y1); ctx.lineTo(x2, ctx.canvas.height - y2);
			ctx.moveTo(ctx.canvas.width - x1, ctx.canvas.height - y1); 
			ctx.lineTo(ctx.canvas.width - x2, ctx.canvas.height - y2);
			ctx.stroke();
		}
	};

	my.drawNextLine = function () {
		if (ctx) {
			my.nextLine();
			ctx.strokeStyle = my.nextColor();
			ctx.lineWidth = my.lineWidth;
			my.drawFourLines(lx1[idx], ly1[idx], lx2[idx], ly2[idx]);
		}
	};

	my.eraseLastLine = function() {
		if (ctx) {
			var last_idx = idx + 1;
			if (last_idx >= my.numLines) { last_idx = 0; }
			ctx.strokeStyle = bgColor;
			ctx.lineWidth = my.lineWidth + 1;
			my.drawFourLines(lx1[last_idx], ly1[last_idx], lx2[last_idx], ly2[last_idx]);
		}
	};

	my.drawNext = function () {
		my.drawNextLine();
		my.eraseLastLine();
	};

	my.start = function () {
		if (ctx) {
			if (timer) clearTimeout(timer);
			timer = setInterval(my.drawNext, my.timeInterval);
		}
		else {
			console.log("ERROR: LinesJS: Must set 'canvasId' in constructor, or call setup().");
		}
	};

	my.stop = function () {
		if (timer) {
			clearTimeout(timer);
		}
	};

	my.fullscreen = function () {
		if (canvas) {
			if (canvas.requestFullscreen) {
				canvas.requestFullscreen();
				document.addEventListener("fullscreenchange", my.fullscreenchange, false);
			} else if (canvas.msRequestFullscreen) {
				canvas.msRequestFullscreen();
				document.addEventListener("msfullscreenchange", my.fullscreenchange, false);
			} else if (canvas.mozRequestFullScreen) {
				canvas.mozRequestFullScreen();
				document.addEventListener("mozfullscreenchange", my.fullscreenchange, false);
			} else if (canvas.webkitRequestFullscreen) {
				canvas.webkitRequestFullscreen();
				document.addEventListener("webkitfullscreenchange", my.fullscreenchange, false);
			}
		}
	};

	// called when entering and exiting full screen
	my.fullscreenchange = function () {
		if (fullmode == false) {
			// entering fullscreen
			fullmode = true;
			// backup canvas
			bu.width = ctx.canvas.width;
			bu.height = ctx.canvas.height;
			bu.skipMin = my.skipMin;
			bu.skipMax = my.skipMax;
			bu.lineWidth = my.lineWidth;
			// resize canvas to fullscreen
			var winW = window.innerWidth, winH = window.innerHeight;
			canvas.style.width = winW + 'px';
			canvas.style.height = winH + 'px';
			ctx.canvas.width = winW;
			ctx.canvas.height = winH;
			my.skipMin = Math.floor(winW / 160); // 160
			my.skipMax = Math.floor(winW / 60);  // 40
			my.lineWidth = my.lineWidthFS;
			// restart lines
			my.clear();
			my.resetLine();
		}
		else {
			// exiting fullscreen
			fullmode = false;
			// restore canvas
			canvas.style.width = bu.width + 'px';
			canvas.style.height = bu.height + 'px';
			ctx.canvas.width = bu.width;
			ctx.canvas.height = bu.height;
			my.skipMin = bu.skipMin;
			my.skipMax = bu.skipMax;
			my.lineWidth = bu.lineWidth;
			// restart lines
			my.clear();
			my.resetLine();
		}
	};

  // constructor
  my.setup(my.canvasId);
	return my;
}
