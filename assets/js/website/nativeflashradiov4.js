/*
 HTML5 RADIO PLAYER V4.19.05.08
 https://www.flashradio.info

 Copyright (C) SODAH | JOERG KRUEGER
 https://www.sodah.de

*/
(function (a, l) { typeof define === 'function' && define.amd ? define(['jquery'], l) : a.jQuery ? l(a.jQuery) : l(a.Zepto); })(this, (a, l) => {
  a.fn.flashradio = function (g) {
    var e = typeof g === 'string'; var t = Array.prototype.slice.call(arguments, 1); var G = this; g = !e && t.length ? a.extend.apply(null, [!0, g].concat(t)) : g; if (e && g.charAt(0) === '_') { return G; }e ? this.each(function () { var e = a(this).data('flashradio'); var Q = e && a.isFunction(e[g]) ? e[g].apply(e, t) : e; if (Q !== e && Q !== l) { return G = Q, !1; } }) : this.each(function () {
      a(this).data('flashradio', new a.flashradio(this,
        g));
    }); return G;
  }; a.flashradio = function (g, e) {
    function t (a) { var b = document.createElement('link'); b.type = 'text/css'; b.rel = 'stylesheet'; b.href = 'https://fonts.googleapis.com/css?family=' + a; document.getElementsByTagName('head')[0].appendChild(b); } function G () {
      navigator.userAgent.toString().toLowerCase(); try { var h = window.localStorage.getItem(b + 'volume'); h !== null && (C = h); } catch (z) { D(z); }Ga() && (C = 100); Ta != '' && t(Ta); Ua != '' && t(Ua); Va = document.getElementById(b); Va.innerHTML = ''; a('#' + b).addClass('sodahnativeflashradio4').css({ overflow: 'hidden',
        display: 'block' }); E = document.createElement('div'); E.id = b + 'containerinside'; Va.appendChild(E); a('#' + b + 'containerinside').css({ position: 'relative', left: '0px', top: '0px', height: '100%', width: '100%', background: Wa }); x == 'big' && (qa() || (h = document.createElement('img'), h.id = b + 'coverblurshadow1', E.appendChild(h), a('#' + b + 'coverblurshadow1').css({ 'z-index': '17', '-webkit-filter': 'blur(40px)', filter: 'blur(40px)', opacity: '1', position: 'absolute', 'border-radius': '50%', padding: '0', margin: '0' }).disableSelection(), h = document.createElement('img'),
      h.id = b + 'coverblurshadow2', E.appendChild(h), a('#' + b + 'coverblurshadow2').css({ 'z-index': '18', '-webkit-filter': 'blur(40px)', filter: 'blur(40px)', opacity: '1', position: 'absolute', 'border-radius': '50%', padding: '0', margin: '0' }).disableSelection()), h = document.createElement('div'), h.id = b + 'volumecontrollerbackground', E.appendChild(h), a('#' + b + 'volumecontrollerbackground').css({ 'z-index': '19', position: 'absolute', 'background-color': H, opacity: '0.1', left: '20px', height: '3px', overflow: 'hidden', 'border-radius': '1.5px' }).disableSelection());
      Ma = document.createElement('div'); Ma.id = b + 'volumecontroller'; E.appendChild(Ma); a('#' + b + 'volumecontroller').css({ 'z-index': '20', position: 'absolute', 'background-color': Nb }).disableSelection(); x == 'big' && a('#' + b + 'volumecontroller').css({ 'background-color': H, left: '20px', height: '3px', width: '0', 'border-radius': '1.5px' }); x == 'big' ? (h = document.createElement('div'), h.id = b + 'volumeicon', Ma.appendChild(h), a('#' + b + 'volumeicon').css({ 'z-index': '20',
        position: 'absolute',
        top: '-3px',
        right: '-20px',
        height: '8.891px',
        width: '40px',
        padding: '0',
        margin: '0',
        'line-height': '0px',
        'background-color': H,
        fill: m }).html('<svg version="1.1" id="Ebene_3" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 548 122" style="enable-background:new 0 0 548 122;" xml:space="preserve"><path d="M535.5,0.5h-523c-6.6,0-12,5.4-12,12v97c0,6.6,5.4,12,12,12h523c6.6,0,12-5.4,12-12v-97C547.5,5.9,542.1,0.5,535.5,0.5z M231.5,105.5h-24v-89h24V105.5z M286.5,105.5h-24v-89h24V105.5z M340.5,105.5h-24v-89h24V105.5z"/></svg>').disableSelection(),
      h = document.createElement('div'), h.id = b + 'temp_stationname', E.appendChild(h), a('#' + b + 'temp_stationname').css({ 'z-index': '0', 'font-family': ia, overflow: 'visible', position: 'absolute', opacity: 0, 'text-align': 'left', 'white-space': 'nowrap', height: '24px', 'font-size': '16px', lineHeight: '16px' }).disableSelection(), h = document.createElement('div'), h.id = b + 'temp_artist', E.appendChild(h), a('#' + b + 'temp_artist').css({ 'z-index': '0',
        'font-family': ia,
        overflow: 'visible',
        position: 'absolute',
        opacity: 0,
        'text-align': 'left',
        'white-space': 'nowrap',
        height: '30px',
        'font-size': '20px',
        lineHeight: '20px' }).disableSelection(), h = document.createElement('div'), h.id = b + 'temp_songtitle', E.appendChild(h), a('#' + b + 'temp_songtitle').css({ 'z-index': '0', 'font-family': ia, overflow: 'visible', position: 'absolute', opacity: 0, 'text-align': 'left', 'white-space': 'nowrap', height: '24px', 'font-size': '16px', lineHeight: '16px' }).disableSelection()) : (Xa = document.createElement('div'), Xa.id = b + 'temp_song', E.appendChild(Xa), a('#' + b + 'temp_song').css({ position: 'absolute',
        'z-index': '0',
        'font-family': ia,
        overflow: 'visible',
        opacity: 0,
        'text-align': 'left',
        'white-space': 'nowrap' }).disableSelection(), Ya = document.createElement('div'), Ya.id = b + 'temp_radio', E.appendChild(Ya), a('#' + b + 'temp_radio').css({ position: 'absolute', 'z-index': '0', 'font-family': Na, overflow: 'visible', opacity: 0, 'text-align': 'left', 'white-space': 'nowrap' }).disableSelection()); try {
        d = document.createElement('canvas'), d.id = b + 'canvas', E.appendChild(d), a('#' + b + 'canvas').css({ 'z-index': '21',
          display: 'block',
          background: 'none',
          position: 'absolute' }), x == 'big' && a('#' + b + 'canvas').css({ 'z-index': '5' }), c = d.getContext('2d'), c.fillStyle = m;
      } catch (z) { D(z); }x == 'big' ? (h = document.createElement('div'), h.id = b + 'stationname', E.appendChild(h), a('#' + b + 'stationname').css({ 'z-index': '22', 'font-family': Na, overflow: 'hidden', position: 'absolute', left: '20px', color: H, 'text-align': 'left', 'white-space': 'nowrap', height: '24px', 'font-size': '16px', lineHeight: '16px', 'text-shadow': '0px 0px 5px rgba(' + p(fa).r + ', ' + p(fa).g + ', ' + p(fa).b + ', 0.6)' }).disableSelection(),
      h = document.createElement('div'), h.id = b + 'artist', E.appendChild(h), a('#' + b + 'artist').css({ 'z-index': '22', 'font-family': ia, overflow: 'hidden', position: 'absolute', left: '20px', color: H, 'text-align': 'left', 'white-space': 'nowrap', height: '30px', 'font-size': '20px', lineHeight: '20px', 'text-shadow': '0px 0px 5px rgba(' + p(fa).r + ', ' + p(fa).g + ', ' + p(fa).b + ', 0.6)' }).disableSelection(), h = document.createElement('div'), h.id = b + 'songtitle', E.appendChild(h), a('#' + b + 'songtitle').css({ 'z-index': '22',
        position: 'absolute',
        left: '20px',
        overflow: 'hidden',
        'font-family': ia,
        color: H,
        'white-space': 'nowrap',
        height: '24px',
        'font-size': '16px',
        lineHeight: '16px',
        'text-shadow': '0px 0px 5px rgba(' + p(fa).r + ', ' + p(fa).g + ', ' + p(fa).b + ', 0.6)' }).disableSelection()) : (channelname = document.createElement('div'), channelname.id = b + 'channelname', E.appendChild(channelname), a('#' + b + 'channelname').css({ position: 'absolute', 'z-index': '22', overflow: 'hidden', 'font-family': Na, color: H, 'white-space': 'nowrap', 'text-align': 'left' }).disableSelection(), Za = document.createElement('div'),
      Za.id = b + 'statustext', E.appendChild(Za), a('#' + b + 'statustext').css({ position: 'absolute', 'z-index': '22', overflow: 'hidden', 'font-family': ia, color: H, 'white-space': 'nowrap', 'text-align': 'left' }).disableSelection()); ra = document.createElement('div'); ra.id = b + 'volumesetcontainer'; E.appendChild(ra); a('#' + b + 'volumesetcontainer').css({ position: 'absolute', 'z-index': '43' }).disableSelection(); x == 'big' && a('#' + b + 'volumesetcontainer').css({ height: '40px', width: '40px', bottom: '40px', right: '20px' }); $a = document.createElement('div');
      $a.id = b + 'volumeupbutton'; ra.appendChild($a); a('#' + b + 'volumeupbutton').css({ position: 'absolute', fill: H }).html('<svg xmlns="http://www.w3.org/2000/svg"xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 800 800"><path fill-rule="evenodd" clip-rule="evenodd" d="M545.676,86.489c14.686-2.451,25.617,5.51,36.586,10.976 c50.467,25.145,90.846,61.559,121.957,105.695c36.729,52.107,62.104,111.54,63.418,197.163 c0.619,40.392-6.879,78.427-18.293,110.574c-11.559,32.553-26.215,59.762-44.717,85.369 c-27.123,37.537-59.275,70.676-100.818,94.313c-6.74,3.836-13.5,8.24-20.732,11.789c-13.199,6.479-33.148,18.762-49.189,6.098 c-9.744-7.693-15.137-23.627-7.316-36.586c5.221-8.65,14.797-12.842,24.391-17.074c19.174-8.459,36.504-19.939,52.441-32.521 c42.008-33.164,74.291-75.611,93.092-132.932c8.752-26.68,17.211-60.645,14.23-97.159c-0.783-9.597-0.719-18.443-1.627-26.831 c-2.674-24.729-8.688-46.792-17.074-67.482c-10.945-26.999-23.814-50.801-40.652-72.36c-7.646-9.793-16.938-20.547-26.83-29.676 c-19.475-17.972-41.15-34.263-65.855-47.156c-14.627-7.633-34.898-12.01-36.182-33.741 C521.668,100.793,533.361,88.544,545.676,86.489z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M342.417,131.613c13.52-0.659,24.913,8.526,28.049,19.919 c2.251,8.171,1.22,19.046,1.22,30.083c0,145.936,0,287.211,0,434.165c0,10.596,1.203,21.74-0.407,30.488 c-2.75,14.943-20.474,27.541-38.619,19.92c-7.665-3.219-14.735-11.482-21.139-17.887c-42.516-42.516-83.082-83.488-126.021-126.428 c-3.266-3.268-7.283-7.953-10.569-8.539c-9.47-1.68-20.244,0-30.083,0c-19.667,0-39.878,0-60.166,0 c-10.165,0-20.518,1.055-29.27-0.813c-10.942-2.334-20.231-10.883-22.358-21.139c-1.349-6.498-0.407-14.875-0.407-22.764 c0-46.528,0-90.371,0-137.405c0-10.514-0.845-21.152,2.439-28.049c3.64-7.646,11.651-14.358,22.358-15.854 c17.026-2.38,39.482-0.407,58.133-0.407c21.264,0,40.268,0,58.539,0c5.924,0,17.312-14.872,21.139-18.7 c38.748-38.748,76.943-76.537,116.265-115.858C320.443,143.423,326.955,132.366,342.417,131.613z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M504.212,190.151c11.813-0.833,23.587,6.137,33.741,11.789 c28.867,16.071,53.221,37.1,71.547,62.604c12.014,16.717,24.061,35.695,31.709,57.726c7.678,22.119,12.268,47.98,13.414,75.207 c1.213,28.769-5.297,54.604-12.602,76.831c-14.658,44.607-41.742,77.303-74.393,104.477c-7.686,6.396-16.842,12.406-26.83,17.887 c-12.879,7.066-29.714,18.773-46.343,10.977c-12.367-5.799-21.715-23.805-12.604-39.434c5.439-9.326,16.416-13.232,25.611-18.293 c33.083-18.203,60.483-44.904,76.019-81.303c10.098-23.66,17.5-53.273,13.822-87.81c-2.361-22.174-9.406-41.17-17.074-56.913 c-8.992-18.46-23.578-37.04-38.619-50.002c-12.168-10.487-24.719-18.474-39.839-26.423c-12.549-6.597-28.033-16.262-22.766-37.4 C481.554,199.86,491.683,191.036,504.212,190.151z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M456.649,294.627c12.543-2.064,22.457,3.727,31.303,8.943 c18.758,11.064,33.714,28.004,43.089,48.376c5.629,12.23,10.859,30.956,10.57,47.969c-0.658,38.536-18.93,70.033-41.466,88.215 c-4.451,3.594-10.027,6.871-15.854,10.164c-5.461,3.084-11.988,6.908-17.887,7.723c-14.371,1.984-26.4-7.043-30.488-16.666 c-2.91-6.854-3.279-16.693,0.406-23.58c7.52-14.049,26.189-18.113,36.586-30.082c5.488-6.314,9.74-14.529,11.383-23.577\tc4.76-26.199-5.623-44.244-19.512-54.475c-9.348-6.883-21.275-12.916-28.457-23.171 C428.942,315.932,439.655,297.505,456.649,294.627z"/></svg>').disableSelection();
      x == 'big' && a('#' + b + 'volumeupbutton').css({ height: '40px', width: '40px' }); ab = document.createElement('div'); ab.id = b + 'volumeoffbutton'; ra.appendChild(ab); a('#' + b + 'volumeoffbutton').css({ position: 'absolute', fill: H, visibility: 'hidden' }).html('<svg xmlns="http://www.w3.org/2000/svg"xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 800 800"><path fill-rule="evenodd" clip-rule="evenodd" d="M342.417,131.613c13.52-0.659,24.913,8.526,28.049,19.919 c2.251,8.171,1.22,19.046,1.22,30.083c0,145.936,0,287.211,0,434.165c0,10.596,1.203,21.74-0.407,30.488 c-2.75,14.943-20.474,27.541-38.619,19.92c-7.665-3.219-14.735-11.482-21.139-17.887c-42.516-42.516-83.082-83.488-126.021-126.428 c-3.266-3.268-7.283-7.953-10.569-8.539c-9.47-1.68-20.244,0-30.083,0c-19.667,0-39.878,0-60.166,0 c-10.165,0-20.518,1.055-29.27-0.813c-10.942-2.334-20.231-10.883-22.358-21.139c-1.349-6.498-0.407-14.875-0.407-22.764 c0-46.528,0-90.371,0-137.405c0-10.514-0.845-21.152,2.439-28.049c3.64-7.646,11.651-14.358,22.358-15.854 c17.026-2.38,39.482-0.407,58.133-0.407c21.264,0,40.268,0,58.539,0c5.924,0,17.312-14.872,21.139-18.7 c38.748-38.748,76.943-76.537,116.265-115.858C320.443,143.423,326.955,132.366,342.417,131.613z"/></svg>').disableSelection();
      x == 'big' && a('#' + b + 'volumeoffbutton').css({ height: '40px', width: '40px' }); x == 'small' && (xa = document.createElement('div'), xa.id = b + 'volumetext', ra.appendChild(xa), a('#' + b + 'volumetext').css({ position: 'absolute', 'font-family': ia, color: H, 'white-space': 'nowrap', 'text-align': 'center' }).disableSelection()); Oa = document.createElement('img'); Oa.id = b + 'volumehit'; ra.appendChild(Oa); Oa.src = 'data:image/gif;base64,R0lGODlhAQABAJEAAAAAAP///////wAAACH5BAEAAAIALAAAAAABAAEAAAICVAEAOw%3D%3D'; a('#' + b + 'volumehit').css({ position: 'absolute',
        cursor: 'pointer',
        'z-index': '24',
        padding: '0',
        margin: '0' }); Ga() || a('#' + b + 'volumehit').mouseenter(() => { C == 0 ? (a('#' + b + 'volumeoffbutton').stop(), a('#' + b + 'volumeoffbutton').animate({ opacity: 0.5 }, 200, () => {})) : (a('#' + b + 'volumeupbutton').stop(), a('#' + b + 'volumeupbutton').animate({ opacity: 0.5 }, 200, () => {})); }).mouseleave(() => {
        C == 0 ? (a('#' + b + 'volumeoffbutton').stop(), a('#' + b + 'volumeoffbutton').animate({ opacity: 1 }, 200, () => {})) : (a('#' + b + 'volumeupbutton').stop(), a('#' + b + 'volumeupbutton').animate({ opacity: 1 },
          200, () => {}));
      }).click(() => { C == 0 ? (C = Ob, Q(C)) : (Ob = C, Q(0, C), C = 0); B(); }); a('#' + b + 'volumehit').disableSelection(); x == 'big' && a('#' + b + 'volumehit').css({ height: '40px', width: '40px' }); if (la == 'true') {
        a('#' + b + 'volumetext').css({ opacity: 0.25 }); x == 'small' && (a('#' + b + 'volumeupbutton').css({ opacity: 0.25 }), a('#' + b + 'volumeoffbutton').css({ opacity: 0.25 })); h = document.createElement('div'); h.id = b + 'imagecontainer'; E.appendChild(h); a('#' + b + 'imagecontainer').css({ position: 'absolute',
          'z-index': '19',
          'background-color': m,
          'box-sizing': 'border-box',
          '-moz-box-sizing': 'border-box',
          '-webkit-box-sizing': 'border-box',
          border: '2px solid ' + m }).disableSelection(); x == 'big' && a('#' + b + 'imagecontainer').css({ overflow: 'hidden', 'background-color': 'transparent', 'border-radius': '50%', border: '0' }); var k = document.createElement('img'); k.id = b + 'imagehit1'; h.appendChild(k); a('#' + b + 'imagehit1').css({ position: 'absolute', 'z-index': '21', top: '0px', left: '0px', height: '100%', width: '100%', cursor: 'pointer', padding: '0', margin: '0' }).click(() => {
          ma !=
	'' && window.open(ma);
        }).fadeOut(0).disableSelection(); k = document.createElement('img'); k.id = b + 'imagehit2'; h.appendChild(k); a('#' + b + 'imagehit2').css({ position: 'absolute', 'z-index': '20', top: '0px', left: '0px', height: '100%', width: '100%', cursor: 'pointer', padding: '0', margin: '0' }).click(() => { ma != '' && window.open(ma); }).fadeOut(0).disableSelection(); x == 'big' && a('#' + b + 'imagehit1, #' + b + 'imagehit2').css({ 'box-sizing': 'border-box',
          '-moz-box-sizing': 'border-box',
          '-webkit-box-sizing': 'border-box',
          border: '20px solid rgba(' +
	p(H).r + ', ' + p(H).g + ', ' + p(H).b + ', 0.25)',
          'border-radius': '50%' });
      } else { a('#' + b + 'volumesetcontainer').css({ 'background-color': m }); }Pa = document.createElement('img'); Pa.id = b + 'volumegrab'; Pa.src = 'data:image/gif;base64,R0lGODlhAQABAJEAAAAAAP///////wAAACH5BAEAAAIALAAAAAABAAEAAAICVAEAOw%3D%3D'; E.appendChild(Pa); a('#' + b + 'volumegrab').css({ position: 'absolute', 'z-index': '44', padding: '0', margin: '0' }).disableSelection(); x == 'big' && a('#' + b + 'volumegrab').css({ left: '20px' }); Ga() || (a('#' + b + 'volumegrab').mouseover((h) => {
        a('#' +
	b + 'volumegrab').css('cursor', 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABx0RVh0U29mdHdhcmUAQWRvYmUgRmlyZXdvcmtzIENTNAay06AAAALlSURBVEiJxZe9bhNBEMd/5zsSkhjs0Fi0SYG7CAmltQUpeAGeISmTB6CFSOQFkoKOwqJAQAQNCCHyIUs0KYAiEmUaQ2GshORuPyhu196c95wLSHik0a3v7P3Nf2Zudx1orRmHlcZCHSc48t0MgqDIbwPjANr4SHPL6gWPsJIDe2k+PwAUIIwXaxqt9ZB7LAC2gTfANeCtNga8A24CVeAqEDrB5bKKgrctaHNzU5fLZe2Aj42/B2omsEkTQC64SHOVgMaI54GUcjqO47vAd+AFcB2YAq7kqS8K9ppSCiAQQiCEAAi63e494DkwC0yT9tEQvAjY7V7m5+cBkFJaGEmS9MFCCDqdTgN4Rlr3aTxpLwLWwMOtrS0Ams0mjUZjCGaDcMZ3gBvADJ6UFwU/XV5ePraTKqXIgbnjgLTWFnyOVeQ91qTvJ0mSoJSi1Wr1A7AwKWVfvRlD2t0TeFI9Cmxr238vLUwphZQSKSVHR0eTLiwDDo1Sd+GBrPyMvQa6wCvSBumn0dbXNpj1w8PDSaf2Nniv5SkuAY1er1dWSt2vVCotTBqtWt/VHRvLXT7zFAfAjlXU6XSaFmwV+dw+29vbA/hGuoYrPJtIbqqjKFqvVqsf7KRLS0tTPojPV1ZWDhg0pTTwQoq1EOJzGIYbtVrtU5IkrK6uemG+e8At4BEQG5dZxXk1VkAipWwDQghBvV4nW2Nfndvttp0jBk6BMzzb5aiuFsBJFEXrc3NzH0fV1PW1tbUD4Ou/gBUQCyH2wzB8Uq/Xdy5qKifNjw30FEi4RI1d+JmUcj8Mw42FhYVdC8mrt7EY+G089oEvWjJtZ55IKXfDMAwWFxdvk9mxMvbFAE/ISTNA4DtxeA57JdJ1d4Z0n50FyqTrsJs1TarwF/AD+El6OpHwd4c9ZaLXzthu8lmwIFXcM98bSjMUV2ytZGAT5jq06zA4ccYMFpA0Kod1WTAM6juqzjYz5ya/EPw/bGx/Yf4AHxykPX4eCXQAAAAASUVORK5CYII%3D), auto');
      }),
      a('#' + b + 'volumegrab').grab({ onstart: function (h) {
        a('#' + b + 'volumegrab').css('cursor', 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABx0RVh0U29mdHdhcmUAQWRvYmUgRmlyZXdvcmtzIENTNAay06AAAAKmSURBVEiJ7ZbPaxNBFMc/m4lttYtNBem9F3MrgvRawR78C/wbemz/CS3Yf8OLXgQ9KAgi9gcBLz2oh0IOhfZSLdUkTZN9s+NhZtpNdrJZFeyhDgzz2GTn8977vnmzkTGGyxiVS6H+B18JcDX0MIqiMu9GbgKYoTU4sicoCC4BU8BLZz8CUkC7mToHis+pMSY3C6CvgRbwRkRMr9czwDugDbwFbgExMOmcG8kqC47iODbGGCMiJo5j0+12TafTMUDn5OTEHB8fG6DjHLntHLjGhRwDjLLFFbXb7baIICIAZOxKxo4ODg4eAC+AWeAGVs5c0ZQFK4AkSUJgRIQkSQAiEaHZbC4Bz4Cag+fSXlRcvpAq3msRIU1T9vf3ERG01hweHk552zvh7HtYzROgjy28cx2LIn4F/HBrnI3SR661Pn8mIuzt7U1lshIBN4FprNYDrFERV4ClVqsVp2n6cGZm5nk2Yq11cM3abkw6aC7VoyKOgE0f0dHR0X0P9hGFpv9te3sb4CuDTaYUmGq1ul6r1d77TZeXl6+HIKG5srKyi9VTGNJ2HNiIyCel1Mbc3NzHJElYXV0NwkLPgDvAY2xR5QoLRmucAonWugGIiFCv1xnWOKRzo9Hwe/SBM6DnIh8AF1W1AKfVanV9fn7+Q5Gm2bm2trYLfPkbcAr0RWRHKfW0Xq9vjiuqTJqfOOgZ9hynw5uP61wp0NNa7yilNhYWFrY8ZJTebvSBrpv9EHjctegr81RrvaWUihYXF+9ScEyAzw54yog0A0Sh2yjwIVDBNoNpbPOfxXazCQazZrAR/gS+Ad+xN5aGP/sQSJ33JmP7m2cYLNiIW+5/uTRD+Yj98BfGhFtzrdCBBBu5byDWqwzrd8FwoW+Rzj4zA5uPBf+LcfW+q38BmqVkrsNuDnIAAAAASUVORK5CYII%3D), auto');
        ha = x == 'big' ? a('#' + b + 'volumecontroller').width() : F ? a('#' + b + 'volumecontroller').height() : a('#' + b + 'volumecontroller').width();
      },
      onmove: function (h) {
        if (x == 'big') { ha + h.offset.x < a('#' + b + 'volumegrab').width() ? a('#' + b + 'volumecontroller').css({ width: ha + h.offset.x + 'px' }) : a('#' + b + 'volumecontroller').css({ width: a('#' + b + 'volumegrab').width() + 'px' }), ha + h.offset.x < 0 && a('#' + b + 'volumecontroller').css({ width: '0px' }), C = 100 * a('#' + b + 'volumecontroller').width() / a('#' + b + 'volumegrab').width(); } else {
          if (F) {
            ha + h.offset.y < a('#' +
	b + 'volumegrab').height() ? a('#' + b + 'volumecontroller').css({ height: ha + h.offset.y + 'px' }) : a('#' + b + 'volumecontroller').css({ height: a('#' + b + 'volumegrab').height() + 'px' }); ha + h.offset.y < 0 && a('#' + b + 'volumecontroller').css({ height: '0px' }); try { d.height = a('#' + b + 'volumecontroller').height(); } catch (Ha) { D(Ha); }C = 100 * a('#' + b + 'volumecontroller').height() / a('#' + b + 'volumegrab').height();
          } else {
            ha + h.offset.x < a('#' + b + 'volumegrab').width() ? a('#' + b + 'volumecontroller').css({ width: ha + h.offset.x + 'px' }) : a('#' + b + 'volumecontroller').css({ width: a('#' +
	b + 'volumegrab').width() + 'px' }); ha + h.offset.x < 0 && a('#' + b + 'volumecontroller').css({ width: '0px' }); try { d.width = a('#' + b + 'volumecontroller').width(); } catch (Ha) { D(Ha); }C = 100 * a('#' + b + 'volumecontroller').width() / a('#' + b + 'volumegrab').width();
          }xa.innerHTML = Math.ceil(C) + '%';
        }B(); L.volume = C / 100;
      },
      onfinish: function (h) {
        a('#' + b + 'volumegrab').css('cursor', 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEgAACxIB0t1+/AAAABx0RVh0U29mdHdhcmUAQWRvYmUgRmlyZXdvcmtzIENTNAay06AAAALlSURBVEiJxZe9bhNBEMd/5zsSkhjs0Fi0SYG7CAmltQUpeAGeISmTB6CFSOQFkoKOwqJAQAQNCCHyIUs0KYAiEmUaQ2GshORuPyhu196c95wLSHik0a3v7P3Nf2Zudx1orRmHlcZCHSc48t0MgqDIbwPjANr4SHPL6gWPsJIDe2k+PwAUIIwXaxqt9ZB7LAC2gTfANeCtNga8A24CVeAqEDrB5bKKgrctaHNzU5fLZe2Aj42/B2omsEkTQC64SHOVgMaI54GUcjqO47vAd+AFcB2YAq7kqS8K9ppSCiAQQiCEAAi63e494DkwC0yT9tEQvAjY7V7m5+cBkFJaGEmS9MFCCDqdTgN4Rlr3aTxpLwLWwMOtrS0Ams0mjUZjCGaDcMZ3gBvADJ6UFwU/XV5ePraTKqXIgbnjgLTWFnyOVeQ91qTvJ0mSoJSi1Wr1A7AwKWVfvRlD2t0TeFI9Cmxr238vLUwphZQSKSVHR0eTLiwDDo1Sd+GBrPyMvQa6wCvSBumn0dbXNpj1w8PDSaf2Nniv5SkuAY1er1dWSt2vVCotTBqtWt/VHRvLXT7zFAfAjlXU6XSaFmwV+dw+29vbA/hGuoYrPJtIbqqjKFqvVqsf7KRLS0tTPojPV1ZWDhg0pTTwQoq1EOJzGIYbtVrtU5IkrK6uemG+e8At4BEQG5dZxXk1VkAipWwDQghBvV4nW2Nfndvttp0jBk6BMzzb5aiuFsBJFEXrc3NzH0fV1PW1tbUD4Ou/gBUQCyH2wzB8Uq/Xdy5qKifNjw30FEi4RI1d+JmUcj8Mw42FhYVdC8mrt7EY+G089oEvWjJtZ55IKXfDMAwWFxdvk9mxMvbFAE/ISTNA4DtxeA57JdJ1d4Z0n50FyqTrsJs1TarwF/AD+El6OpHwd4c9ZaLXzthu8lmwIFXcM98bSjMUV2ytZGAT5jq06zA4ccYMFpA0Kod1WTAM6juqzjYz5ya/EPw/bGx/Yf4AHxykPX4eCXQAAAAASUVORK5CYII%3D), auto');
        try { window.localStorage.removeItem(b + 'volume'), window.localStorage.setItem(b + 'volume', C); } catch (Ha) { D(Ha); }
      } })); ya = document.createElement('div'); ya.id = b + 'playstopcontainer'; E.appendChild(ya); mobilecheck() || a('#' + b + 'playstopcontainer').mouseenter(() => { na ? (a('#' + b + 'stopbutton').stop(), a('#' + b + 'stopbutton').animate({ opacity: 0.5 }, 200, () => {})) : (a('#' + b + 'playbutton').stop(), a('#' + b + 'playbutton').animate({ opacity: 0.5 }, 200, () => {})); }).mouseleave(() => {
        na ? (a('#' + b + 'stopbutton').stop(), a('#' +
	b + 'stopbutton').animate({ opacity: 1 }, 200, () => {})) : (a('#' + b + 'playbutton').stop(), a('#' + b + 'playbutton').animate({ opacity: 1 }, 200, () => {}));
      }); a('#' + b + 'playstopcontainer').click(() => { (na = !na) ? Z() : W(); }).disableSelection(); x == 'big' ? a('#' + b + 'playstopcontainer').css({ 'z-index': '42', position: 'absolute', height: '80px', width: '80px', overflow: 'hidden', 'border-radius': '50%', border: '2px solid ' + H, bottom: '20px', cursor: 'pointer', 'background-color': m }) : a('#' + b + 'playstopcontainer').css({ position: 'absolute',
        left: '0px',
        top: '0px',
        'background-color': m,
        cursor: 'pointer' }); bb = document.createElement('div'); bb.id = b + 'player'; ya.appendChild(bb); a('#' + b + 'player').css({ position: 'absolute', top: '0px', left: '0px', width: '0px', height: '0px' }); cb = document.createElement('div'); cb.id = b + 'playbutton'; ya.appendChild(cb); a('#' + b + 'playbutton').css({ position: 'absolute', 'z-index': '43', fill: H }).html('<svg version="1.1" id="Ebene_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 800 800" enable-background="new 0 0 800 800" xml:space="preserve"><path d="M226.928,725.51c-5.258,3.01-94.982,65.39-94.98,0l-0.001-647.112c0-75.341,92.9-0.739,94.982,0l421.455,285.66 c26.227,26.226,26.229,68.752,0,94.981L226.928,725.51z"/></svg>').disableSelection();
      x == 'big' && a('#' + b + 'playbutton').css({ top: '20px', left: '20px', right: '20px', bottom: '20px' }); db = document.createElement('div'); db.id = b + 'stopbutton'; ya.appendChild(db); a('#' + b + 'stopbutton').css({ position: 'absolute', 'z-index': '44', visibility: 'hidden', fill: H }).html('<svg version="1.1" id="Ebene_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 800 800" style="enable-background:new 0 0 800 800;" xml:space="preserve"><g><path d="M719.4,772H517.8c-27.5,0-50.1-22.5-50.1-50.1V82.1c0-27.5,22.5-50.1,50.1-50.1h201.6c27.5,0,50.1,22.5,50.1,50.1v639.8 C769.5,749.5,747,772,719.4,772z"/></g><g><path d="M280.7,772H79.1C51.5,772,29,749.5,29,721.9V82.1C29,54.5,51.5,32,79.1,32h201.6c27.5,0,50.1,22.5,50.1,50.1v639.8 C330.8,749.5,308.3,772,280.7,772z"/></g></svg>').disableSelection();
      x == 'big' && a('#' + b + 'stopbutton').css({ top: '20px', left: '20px', right: '20px', bottom: '20px' }); L = new Audio(); L.id = b + 'html5audio'; L.preload = 'auto'; setInterval(() => { na && Qa && L.networkState == 1 && L.play()['catch'](() => {}); }, 1E3); x == 'small' && (F ? a('#' + b + 'volumecontroller').css({ height: '0px' }) : a('#' + b + 'volumecontroller').css({ width: '0px' })); B(); a(window).resize(() => { R(); }); R(); setTimeout(() => { R(); }, 200); za(); Q(C, 0); I(); setTimeout(() => { !eb || mobilecheck() || Pb() || (na = !0, Z()); }, 10);
    } function B () {
      C ==
	0 ? (a('#' + b + 'volumeoffbutton').css({ visibility: 'visible' }), a('#' + b + 'volumeupbutton').css({ visibility: 'hidden' })) : (a('#' + b + 'volumeoffbutton').css({ visibility: 'hidden' }), a('#' + b + 'volumeupbutton').css({ visibility: 'visible' }));
    } function Q (h, c) {
      if (x == 'big') {
        c = c || 0, c != h && a({ countNum: c }).animate({ countNum: Math.floor(h) }, { duration: 800, easing: 'linear', step: function () { try { Math.ceil(this.countNum) % 5 == 0 && (L.volume = this.countNum / 100); } catch (z) { D(z); } }, complete: function () { try { L.volume = h / 100; } catch (z) { D(z); } } }), a('#' +
	b + 'volumecontroller').stop(), a('#' + b + 'volumecontroller').animate({ width: (f - 40) / 100 * h + 'px' }, { duration: 800, progress: function () {}, complete: function () {} });
      } else if (c = c || 0, c != h && a({ countNum: c }).animate({ countNum: Math.floor(h) }, { duration: 800, easing: 'linear', step: function () { xa.innerHTML = Math.ceil(this.countNum) + '%'; try { Math.ceil(this.countNum) % 5 == 0 && (L.volume = this.countNum / 100); } catch (z) { D(z); } }, complete: function () { xa.innerHTML = Math.floor(h) + '%'; try { L.volume = h / 100; } catch (z) { D(z); } } }), F) {
        a('#' + b + 'volumecontroller').css({ left: '0px',
          top: f + 'px' }); a('#' + b + 'volumecontroller').stop(); a('#' + b + 'volumecontroller').animate({ height: y / 100 * h + 'px' }, { duration: 800, progress: function () { try { d.height = Math.round(a('#' + b + 'volumecontroller').height()); } catch (z) { D(z); } }, complete: function () { try { d.height = Math.round(a('#' + b + 'volumecontroller').height()); } catch (z) { D(z); } } }); a('#' + b + 'volumecontroller').css({ width: f + 'px', 'border-bottom': 'solid 1px ' + m, 'border-right': 'none' }); try { a('#' + b + 'canvas').css({ top: f + 'px', left: '0px' }), d.width = f; } catch (z) { D(z); }
      } else {
        a('#' +
	b + 'volumecontroller').css({ top: '0px', left: n + 'px' }); a('#' + b + 'volumecontroller').stop(); a('#' + b + 'volumecontroller').animate({ width: y / 100 * h + 'px' }, { duration: 800, progress: function () { try { d.width = Math.round(a('#' + b + 'volumecontroller').width()); } catch (z) { D(z); } }, complete: function () { try { d.width = Math.round(a('#' + b + 'volumecontroller').width()); } catch (z) { D(z); } } }); a('#' + b + 'volumecontroller').css({ 'border-right': 'solid 1px ' + m, 'border-bottom': 'none', height: n + 'px' }); try {
          a('#' + b + 'canvas').css({ top: '0px', left: n + 'px' }),
          d.height = n;
        } catch (z) { D(z); }
      }
    } function R () {
      f = a('#' + b).width(); n = a('#' + b).height(); if (x == 'small') {
        if (F = f < n ? !0 : !1) {
          y = n - 2 * f; a('#' + b + 'volumecontroller').css({ left: '0px', top: f + 'px', width: f + 'px', height: y / 100 * C + 'px', 'border-bottom': 'solid 1px ' + m, 'border-right': 'none' }).stop(); try { a('#' + b + 'canvas').css({ left: '0px', top: f + 'px' }), d.width = f, d.height = Math.round(y / 100 * C); } catch (z) { D(z); }a('#' + b + 'playstopcontainer').css({ height: f + 'px', width: f + 'px' }); a('#' + b + 'playbutton, #' + b + 'stopbutton').css({ top: f / 4 / 2 + 'px',
            left: f /
	4 / 2 + 'px',
            right: f / 4 / 2 + 'px',
            bottom: f / 4 / 2 + 'px' }); a('#' + b + 'channelname').css({ 'font-size': f / 2 + 'px', overflow: 'hidden', 'line-height': f / 2 + 'px', height: f / 2 + 'px', width: y + 'px', top: f + y / 2 + 'px', left: f - f / 2 / 2 - y / 2 + 'px', rotate: '90deg' }); a('#' + b + 'statustext').css({ 'font-size': f / 4 + 'px', 'line-height': f / 4 + 'px', height: f / 4 + 'px', width: y + 'px', top: f + y / 2 + 'px', left: -(y / 2) + f / 10 + f / 4 / 2 + 'px', rotate: '90deg' }); a('#' + b + 'volumegrab').css({ left: '0px', top: f + 'px', height: y + 'px', width: f + 'px' }); la == 'true' ? (a('#' + b + 'channelname').css({ width: y -
	f + 'px',
          top: f + (y - f) / 2 + 'px',
          left: f - f / 2 / 2 - (y - f) / 2 + 'px' }), a('#' + b + 'statustext').css({ width: y - f + 'px', top: f + (y - f) / 2 + 'px', left: -((y - f) / 2) + f / 10 + f / 4 / 2 + 'px' }), a('#' + b + 'imagecontainer').css({ left: '0px', top: f + y + 'px', width: f + 'px', height: f + 'px' }), a('#' + b + 'imagehit1', '#' + b + 'imagehit2').css({ width: f + 'px', height: f + 'px', left: '0px', top: '0px' }), a('#' + b + 'volumesetcontainer').css({ left: '0px', top: y + 'px', width: f + 'px', height: f + 'px' }), a('#' + b + 'volumeupbutton , #' + b + 'volumeoffbutton').css({ height: f / 2 + 'px',
            width: f / 2 + 'px',
            top: (f -
	f / 2) / 2 + 'px',
            left: f - (f / 20 + f / 2) + 'px',
            rotate: '90deg' }), a('#' + b + 'volumetext').css({ 'font-size': f / 4 + 'px', 'line-height': f / 4 + 'px', height: f / 4 + 'px', width: f + 'px', top: f / 2 - f / 8 + 'px', left: f / 4 / 2 - f / 2 + f / 10 + 'px', rotate: '90deg' })) : (a('#' + b + 'volumesetcontainer').css({ left: '0px', top: f + y + 'px', width: f + 'px', height: f + 'px' }), a('#' + b + 'volumeupbutton , #' + b + 'volumeoffbutton').css({ top: f / 20 + 'px', left: (f - f / 2) / 2 + 'px', width: f / 2 + 'px', height: f / 2 + 'px', rotate: '0deg' }), a('#' + b + 'volumetext').css({ 'font-size': f / 4 + 'px',
            'line-height': f /
	4 + 'px',
            height: f / 4 + 'px',
            width: f + 'px',
            top: f - f / 4 - f / 10 + f / 40 + 'px',
            left: '0px',
            rotate: '0deg' }), a('#' + b + 'volumehit').css({ width: f + 'px', height: f + 'px', left: '0px', top: '0px' }));
        } else {
          y = f - 2 * n; a('#' + b + 'volumecontroller').css({ top: '0px', left: n + 'px', height: n + 'px', width: y / 100 * C + 'px', 'border-right': 'solid 1px ' + m, 'border-bottom': 'none' }).stop(); try { a('#' + b + 'canvas').css({ top: '0px', left: n + 'px' }), d.width = Math.round(y / 100 * C), d.height = n; } catch (z) {}a('#' + b + 'playstopcontainer').css({ height: n + 'px', width: n + 'px' }); a('#' + b + 'playbutton, #' +
	b + 'stopbutton').css({ top: n / 4 / 2 + 'px', left: n / 4 / 2 + 'px', right: n / 4 / 2 + 'px', bottom: n / 4 / 2 + 'px' }); a('#' + b + 'volumegrab').css({ top: '0px', left: n + 'px', width: y + 'px', height: n + 'px' }); a('#' + b + 'channelname').css({ top: '0px', left: n + 'px', height: n / 1.5 + 'px', 'font-size': n / 2 + 'px', lineHeight: n / 2 + 'px', 'margin-left': n / 10 + 'px', padding: '0', rotate: '0deg' }); a('#' + b + 'statustext').css({ 'font-size': n / 4 + 'px', 'line-height': n / 4 + 'px', height: n / 2 + 'px', top: n - n / 4 - n / 10 + n / 40 + 'px', left: n + 'px', 'margin-left': n / 10 + 'px', rotate: '0deg' }); la == 'true'
            ? (a('#' + b + 'channelname').css({ width: y - n + 'px' }), a('#' + b + 'statustext').css({ width: y - n + 'px' }), a('#' + b + 'imagecontainer').css({ left: n + y + 'px', top: '0px', width: n + 'px', height: n + 'px' }), a('#' + b + 'imagehit1', '#' + b + 'imagehit2').css({ width: n + 'px', height: n + 'px', left: '0px', top: '0px' }), a('#' + b + 'volumesetcontainer').css({ left: y + 'px', top: '0px', width: n + 'px', height: n + 'px' })) : (a('#' + b + 'channelname').css({ width: y + 'px' }), a('#' + b + 'statustext').css({ width: y + 'px' }), a('#' + b + 'volumesetcontainer').css({ left: n + y + 'px',
              top: '0px',
              width: n +
	'px',
              height: n + 'px' }), a('#' + b + 'volumehit').css({ width: n + 'px', height: n + 'px', left: '0px', top: '0px' })); a('#' + b + 'volumeupbutton, #' + b + 'volumeoffbutton').css({ top: n / 20 + 'px', left: (n - n / 2) / 2 + 'px', width: n / 2 + 'px', height: n / 2 + 'px', rotate: '0deg' }); a('#' + b + 'volumetext').css({ 'font-size': n / 4 + 'px', 'line-height': n / 4 + 'px', height: n / 4 + 'px', width: n + 'px', top: n - n / 4 - n / 10 + n / 40 + 'px', left: '0px', rotate: '0deg' });
        }X(); k();
      } else {
        var h = n / 2 - 20; a('#' + b + 'imagecontainer').css({ height: h + 'px', width: h + 'px', top: '20px', left: f / 2 - h / 2 + 'px' }); qa() ||
	a('#' + b + 'coverblurshadow1, #' + b + 'coverblurshadow2').css({ height: h + 'px', width: h + 'px', top: '80px', left: f / 2 - h / 2 + 'px' }); a('#' + b + 'stationname').css({ top: n / 2 + 20 + 'px', width: f - 40 + 'px' }); a('#' + b + 'artist').css({ top: n / 2 + 50 + 'px', width: f - 40 + 'px' }); a('#' + b + 'songtitle').css({ top: n / 2 + 80 + 'px', width: f - 40 + 'px' }); if (ja == '1' || ja == '2' || ja == '3' || ja == '4' || ja == '5' || ja == '7' || ja == '8') { h = 0; var c = n; } else { h = n / 2, c = n / 2; }a('#' + b + 'canvas').css({ top: h + 'px', height: c + 'px', width: f + 'px' }); d.width = f; d.height = c; a('#' + b + 'footercontainer').css({ width: f +
	'px' }); a('#' + b + 'volumegrab').css({ top: n / 2 + n / 2 / 2 - 20 + 'px', height: '40px', width: f - 40 + 'px' }); a('#' + b + 'volumecontrollerbackground').css({ top: n / 2 + n / 2 / 2 - 1.5 + 'px', width: f - 40 + 'px' }); a('#' + b + 'volumecontroller').css({ top: n / 2 + n / 2 / 2 - 1.5 + 'px', width: (f - 40) / 100 * C + 'px' }).stop(); Ga() && a('#' + b + 'volumesetcontainer, #' + b + 'volumecontroller, #' + b + 'volumecontrollerbackground').css({ display: 'none' }); a('#' + b + 'playstopcontainer').css({ left: f / 2 - 40 + 'px' }); ka(); aa(); J();
      }K = []; for (h = 0; h < 512; h++) {
        c = {}, c.x = Math.floor(Math.random() *
	f + 1), c.y = Math.floor(Math.random() * n + 1), c.radius = F ? Math.floor(Math.random() * f / 5 + 2) : Math.floor(Math.random() * n / 5 + 2), c.alpha = 1, c.speed = Math.floor(50 * Math.random() + 30), K.push(c);
      }
    } function ka () {
      a('#' + b + 'temp_stationname').html(Y); a('#' + b + 'temp_stationname').width() > f - 80 - 40 ? MarqueeStationnamerunning || ($mq_stationname = a('#' + b + 'stationname').marquee({ duration: 5E3 * f / 300, direction: 'left', duplicated: !0 }), MarqueeStationnamerunning = !0) : (a('#' + b + 'stationname').css({ 'text-align': 'center' }).html(Y), MarqueeStationnamerunning =
	!1);
    } function aa () { a('#' + b + 'temp_artist').html(M); M != Qb && (a('#' + b + 'artist').css({ 'text-align': 'left' }).html(M), MarqueeArtistrunning = !1); a('#' + b + 'temp_artist').width() > f - 40 ? MarqueeArtistrunning || ($mq_artist = a('#' + b + 'artist').marquee({ duration: 5E3 * f / 300, direction: 'left', duplicated: !0 }), MarqueeArtistrunning = !0) : (a('#' + b + 'artist').css({ 'text-align': 'center' }).html(M), MarqueeArtistrunning = !1); Qb = M; } function J () {
      a('#' + b + 'temp_songtitle').html(N); N != Rb && (a('#' + b + 'songtitle').css({ 'text-align': 'left' }).html(N),
      MarqueeSongtitlerunning = !1); a('#' + b + 'temp_songtitle').width() > f - 40 ? MarqueeSongtitlerunning || ($mq_songtitle = a('#' + b + 'songtitle').marquee({ duration: 5E3 * f / 300, direction: 'left', duplicated: !0 }), MarqueeSongtitlerunning = !0) : (a('#' + b + 'songtitle').css({ 'text-align': 'center' }).html(N), MarqueeSongtitlerunning = !1); Rb = N;
    } function X () {
      sa.toUpperCase() == 'TRUE' && (Aa = !1, a('#' + b + 'channelname').html(Y), a('#' + b + 'temp_radio').html(Y), ba()); sa.toUpperCase() == 'FALSE' && (a('#' + b + 'channelname').html(Y), a('#' + b + 'channelname').css({ overflow: 'hidden',
        'text-overflow': 'ellipsis' })); if (sa.toUpperCase() == 'AUTO') { a('#' + b + 'temp_radio').css({ 'font-size': n / 2 + 'px', lineHeight: '1' }).html(Y); var h = 2; la == 'true' && (h = 3); a('#' + b + 'channelname').html(Y); Aa = !1; F ? a('#' + b + 'temp_radio').width() > n - h * f ? ba() : (a('#' + b + 'channelname').html(Y), Aa = !1) : a('#' + b + 'temp_radio').width() > f - h * n ? ba() : (a('#' + b + 'channelname').html(Y), Aa = !1); }latest_radioname = Y;
    } function ba () {
      if (!Aa) {
        try { Sb.marquee('destroy'); } catch (wa) {} var h = F ? 2 * (a('#' + b + 'temp_radio').width() + n) : 10 * (a('#' + b + 'temp_radio').width() +
	f); Sb = a('#' + b + 'channelname').marquee({ duration: h, direction: 'left', gap: f / 2, duplicated: !0 }); Aa = !0;
      }
    } function k () {
      sa.toUpperCase() == 'TRUE' && (a('#' + b + 'statustext').html(v), a('#' + b + 'temp_song').html(v), Ba = !1, P()); sa.toUpperCase() == 'FALSE' && v != Tb && (a('#' + b + 'statustext').html(v), a('#' + b + 'statustext').css({ overflow: 'hidden', 'text-overflow': 'ellipsis' })); if (sa.toUpperCase() == 'AUTO') {
        a('#' + b + 'temp_song').css({ 'font-size': n / 4 + 'px', 'line-height': n / 4 + 'px' }).html(v); var h = 2; la == 'true' && (h = 3); a('#' + b + 'statustext').html(v);
        Ba = !1; F ? a('#' + b + 'temp_song').width() > n - h * f ? P() : (a('#' + b + 'statustext').html(v), Ba = !1) : a('#' + b + 'temp_song').width() > f - h * n ? P() : (a('#' + b + 'statustext').html(v), Ba = !1);
      }Tb = v;
    } function P () { if (!Ba) { try { Ub.marquee('destroy'); } catch (wa) {} var h = F ? 2 * (a('#' + b + 'temp_song').width() + n) : 10 * (a('#' + b + 'temp_song').width() + f); Ub = a('#' + b + 'statustext').marquee({ duration: h, direction: 'left', gap: f / 2, duplicated: !0 }); Ba = !0; } } function Z () {
      if (Qa) {
        eb && (da = 'fake'); if (typeof Ia === 'undefined' && da == 'real') {
          try {
            Ia = new (window.AudioContext ||
	window.webkitAudioContext)(), ta = Ia.createAnalyser(), ta.smoothingTimeConstant = 0.9, ta.fftSize = 1024;
          } catch (h) { da == 'real' && (da = 'fake'), D(h); } try { 'crossOrigin' in L && (L.crossOrigin = 'anonymous', L.onerror = ca, Vb = L, Wb = Ia.createMediaElementSource(Vb), Wb.connect(ta), ta.connect(Ia.destination)); } catch (h) { D('SODAH: ' + h); }
        }Xb = r.toLowerCase() != 'none' && r.toLowerCase() != 'nothing' && r.toLowerCase() != 'php' && Yb == 'true' ? r + Ca() : Ca(); a('#' + b + 'playbutton').css({ visibility: 'hidden' }); a('#' + b + 'stopbutton').css({ visibility: 'visible' });
        try { a('.sodahnativeflashradio4').each(function () { a(this).attr('id') != b && a(this).data('flashradio').stopradio(); }); } catch (h) { D(h); }L.src = Xb; L.play()['catch'](() => {});
      }
    } function ca (a) { a.target ? D('server not set correctly') : D('browser doesn\'t support crossOrigin requests'); } function W () { if (L.readyState > 0) { a('#' + b + 'playbutton').css({ visibility: 'visible' }); a('#' + b + 'stopbutton').css({ visibility: 'hidden' }); na = !1; try { L.pause(); } catch (h) {} } } function I () {
      if (da == 'fake' || da == 'real') {
        try {
          window.requestAnimationFrame(I) ||
	window.mozRequestAnimationFrame(I) || window.webkitRequestAnimationFrame(I) || window.msRequestAnimationFrame(I) || window.oRequestAnimationFrame(I);
        } catch (Zb) {} if (da == 'fake') { q = []; for (var a = 0; a < 511; a += 1) { na ? q.push(Math.floor(254 / (a / 100 + 1) * Math.random() + 1)) : q.push(0), Ja[a] += (q[a] - Ja[a]) / 9; }q = Ja; } try { da == 'real' && (q = new Uint8Array(ta.frequencyBinCount), ta.getByteFrequencyData(q)); } catch (Zb) {} try {
          switch (ja) {
            case '1':Da(); break; case '2':c.clearRect(0, 0, d.width, d.height); c.lineWidth = 1; c.miterLimit = 1; c.beginPath();
              if (F) { c.moveTo(0, 0); for (b = 0; b < q.length / 2; b += 1) { c.lineTo(q[b] * d.width / 255, b * d.height / q.length * 2); }c.lineTo(0, d.height); c.lineTo(0, 0); } else { c.moveTo(0, d.height); for (var b = 0; b < q.length / 2; b += 1) { c.lineTo(b * d.width / q.length * 2, d.height - q[b] * d.height / 255 + 2); }c.lineTo(d.width, d.height); c.lineTo(0, d.height); }c.fillStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', 1.0)'; c.fill(); c.closePath(); break; case '3':c.clearRect(0, 0, d.width, d.height); c.lineWidth = 1; c.miterLimit = 1; if (F) {
              for (k = 0; k < d.height; k += 3) {
                g = Math.round(q.length /
	2 * k / d.height), c.beginPath(), c.moveTo(0, k), c.lineTo(q[g] * d.width / 255, k), c.strokeStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', 1.0)', c.stroke(), c.closePath();
              }
            } else { for (var k = 0; k < d.width; k += 3) { var g = Math.round(q.length / 2 * k / d.width); c.beginPath(); c.moveTo(k, d.height); c.lineTo(k, d.height - q[g] * d.height / 255 + 2); c.strokeStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', 1.0)'; c.stroke(); c.closePath(); } } break; case '4':c.clearRect(0, 0, d.width, d.height); c.lineWidth = 0; c.miterLimit = 1; u = []; c.beginPath(); if (F) {
              c.moveTo(0,
                0); u = []; for (f = 0; f < d.height + 20; f += 20) { e = Math.round(q.length / 8 * f / d.height), u.push(q[e] * d.width / 255), u.push(f); }S(c, u, 0.5); c.lineTo(0, d.height); c.lineTo(0, 0);
            } else { c.moveTo(0, d.height); for (var f = 0; f < d.width + 20; f += 20) { var e = Math.round(q.length / 8 * f / d.width); u.push(f); u.push(d.height - q[e] * d.height / 255 + 2); }S(c, u, 0.5); c.lineTo(d.width, d.height); c.lineTo(0, d.height); }c.fillStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', 0.2)'; c.fill(); c.closePath(); c.beginPath(); if (F) {
                c.moveTo(0, 0); u = []; for (f = 0; f < d.height + 20; f +=
	20) { e = Math.round(q.length / 8 * f / d.height), u.push(q[e + e] * d.width / 255), u.push(f); }S(c, u, 0.5); c.lineTo(0, d.height); c.lineTo(0, 0);
              } else { c.moveTo(0, d.height); u = []; for (f = 0; f < d.width + 20; f += 20) { e = Math.round(q.length / 8 * f / d.width), u.push(f), u.push(d.height - q[e + e] * d.height / 255 + 2); }S(c, u, 0.5); c.lineTo(d.width, d.height); c.lineTo(0, d.height); }c.fillStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', 0.3)'; c.fill(); c.closePath(); c.beginPath(); if (F) {
                c.moveTo(0, 0); u = []; for (f = 0; f < d.height + 20; f += 20) {
                  e = Math.round(q.length / 8 * f / d.height),
                  u.push(q[e + e + e] * d.width / 255), u.push(f);
                }S(c, u, 0.5); c.lineTo(0, d.height); c.lineTo(0, 0);
              } else { c.moveTo(0, d.height); u = []; for (f = 0; f < d.width + 20; f += 20) { e = Math.round(q.length / 8 * f / d.width), u.push(f), u.push(d.height - q[e + e + e] * d.height / 255 + 2); }S(c, u, 0.5); c.lineTo(d.width, d.height); c.lineTo(0, d.height); }c.fillStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', 0.4)'; c.fill(); c.closePath(); c.beginPath(); if (F) {
                c.moveTo(0, 0); u = []; for (f = 0; f < d.height + 20; f += 20) {
                  e = Math.round(q.length / 8 * f / d.height), u.push(q[e + e + e + e] * d.width / 255),
                  u.push(f);
                }S(c, u, 0.5); c.lineTo(0, d.height); c.lineTo(0, 0);
              } else { c.moveTo(0, d.height); u = []; for (f = 0; f < d.width + 20; f += 20) { e = Math.round(q.length / 8 * f / d.width), u.push(f), u.push(d.height - q[e + e + e + e] * d.height / 255 + 2); }S(c, u, 0.5); c.lineTo(d.width, d.height); c.lineTo(0, d.height); }c.fillStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', 0.5)'; c.fill(); c.closePath(); break; case '5':c.clearRect(0, 0, d.width, d.height); c.lineWidth = 2; c.lineCap = 'round'; c.miterLimit = 1; c.strokeStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', 1.0)'; u =
	[]; c.beginPath(); if (F) { for (c.moveTo(0, 0), u = [], w = 0; w < d.height + 20; w += 20) { l = Math.round(q.length / 8 * w / d.height), u.push(q[l] * d.width / 255), u.push(w); } } else { c.moveTo(0, d.height); for (var w = 0; w < d.width + 20; w += 20) { var l = Math.round(q.length / 8 * w / d.width); u.push(w); u.push(d.height - q[l] * d.height / 255 + 2); } }S(c, u, 0.5); c.stroke(); c.closePath(); c.lineWidth = 1.8; c.lineCap = 'round'; c.miterLimit = 1; c.strokeStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', 0.8)'; c.beginPath(); if (F) {
                for (c.moveTo(0, 0), u = [], w = 0; w < d.height + 20; w += 20) {
                  l = Math.round(q.length /
	8 * w / d.height), u.push(q[l + l] * d.width / 255), u.push(w);
                }
              } else { for (c.moveTo(0, d.height), u = [], w = 0; w < d.width + 20; w += 20) { l = Math.round(q.length / 8 * w / d.width), u.push(w), u.push(d.height - q[l + l] * d.height / 255 + 2); } }S(c, u, 0.5); c.stroke(); c.closePath(); c.lineWidth = 1.6; c.lineCap = 'round'; c.miterLimit = 1; c.strokeStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', 0.6)'; c.beginPath(); if (F) { for (c.moveTo(0, 0), u = [], w = 0; w < d.height + 20; w += 20) { l = Math.round(q.length / 8 * w / d.height), u.push(q[l + l + l] * d.width / 255), u.push(w); } } else {
                for (c.moveTo(0, d.height),
                u = [], w = 0; w < d.width + 20; w += 20) { l = Math.round(q.length / 8 * w / d.width), u.push(w), u.push(d.height - q[l + l + l] * d.height / 255 + 2); }
              }S(c, u, 0.5); c.stroke(); c.closePath(); c.lineWidth = 1.6; c.lineCap = 'round'; c.miterLimit = 1; c.strokeStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', 0.4)'; c.beginPath(); if (F) { for (c.moveTo(0, 0), u = [], w = 0; w < d.height + 20; w += 20) { l = Math.round(q.length / 8 * w / d.height), u.push(q[l + l + l + l] * d.width / 255), u.push(w); } } else {
                for (c.moveTo(0, d.height), u = [], w = 0; w < d.width + 20; w += 20) {
                  l = Math.round(q.length / 8 * w / d.width), u.push(w),
                  u.push(d.height - q[l + l + l + l] * d.height / 255 + 2);
                }
              }S(c, u, 0.5); c.stroke(); c.closePath(); break; case '6':c.clearRect(0, 0, d.width, d.height); c.lineWidth = 2; c.lineJoin = 'round'; if (F) {
              for (A = 0; A < d.height; A += 5) {
                t = Math.round(q.length / 2 * A / d.height), v = (d.width - q[t] * d.width / 300) / 2, c.beginPath(), c.moveTo(d.width / 2, A), c.lineTo(v, A), c.lineTo(d.width / 2, A), c.strokeStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', 0.5)', c.stroke(), c.closePath(), c.beginPath(), c.moveTo(d.width / 2, A), c.lineTo(d.width - v, A), c.lineTo(d.width / 2, A), c.strokeStyle =
	'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', 0.5)', c.stroke(), c.closePath(), v = (d.width - q[t] * d.width / 600) / 2, c.beginPath(), c.moveTo(d.width / 2, A), c.lineTo(v, A), c.lineTo(d.width / 2, A), c.strokeStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', 0.5)', c.stroke(), c.closePath(), c.beginPath(), c.moveTo(d.width / 2, A), c.lineTo(d.width - v, A), c.lineTo(d.width / 2, A), c.strokeStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', 0.5)', c.stroke(), c.closePath();
              }
            } else {
              for (var A = 0; A < d.width; A += 5) {
                var t = Math.round(q.length / 2 * A / d.width);
                var v = (d.height - q[t] * d.height / 300) / 2; c.beginPath(); c.moveTo(A, d.height / 2); c.lineTo(A, v); c.lineTo(A, d.height / 2); c.strokeStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', 0.5)'; c.stroke(); c.closePath(); c.beginPath(); c.moveTo(A, d.height / 2); c.lineTo(A, d.height - v); c.lineTo(A, d.height / 2); c.strokeStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', 0.5)'; c.stroke(); c.closePath(); v = (d.height - q[t] * d.height / 600) / 2; c.beginPath(); c.moveTo(A, d.height / 2); c.lineTo(A, v); c.lineTo(A, d.height / 2); c.strokeStyle = 'rgba(' + p(m).r + ', ' +
	p(m).g + ', ' + p(m).b + ', 0.5)'; c.stroke(); c.closePath(); c.beginPath(); c.moveTo(A, d.height / 2); c.lineTo(A, d.height - v); c.lineTo(A, d.height / 2); c.strokeStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', 0.5)'; c.stroke(); c.closePath();
              }
            } break; case '7':c.clearRect(0, 0, d.width, d.height); for (var r = 0; r < q.length / 2; r += 2) {
              c.beginPath(), c.moveTo(K[r].x - K[r].radius * q[r] / 255 / 2, n), c.lineTo(K[r].x, n - n * q[r] / 255), c.lineTo(K[r].x + K[r].radius * q[r] / 255 / 2, n), c.fillStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', ' + (q[r] / 255 / 2 + 0.2) +
	')', c.fill(), c.closePath();
            } for (r = 1; r < q.length / 2; r += 2) { c.beginPath(), c.moveTo(K[r].x - K[r].radius * q[r] / 255 / 2, 0), c.lineTo(K[r].x, n * q[r] / 255), c.lineTo(K[r].x + K[r].radius * q[r] / 255 / 2, 0), c.fillStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', ' + (q[r] / 255 / 2 + 0.2) + ')', c.fill(), c.closePath(); } break; case '8':c.clearRect(0, 0, d.width, d.height); fb++; for (a = 0; a < q.length / 2; a++) {
              b = c; r = Math.cos(fb / K[a].speed) * K[a].radius + K[a].x; var x = Math.sin(fb / K[a].speed) * K[a].radius + K[a].y; var y = K[a].radius * q[a] / 255; var P = q[a] / 255 / 2 + 0.5; b.beginPath();
              b.arc(r, x, y, 0, 2 * Math.PI); b.closePath(); b.fillStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', ' + P + ')'; b.fill();
            } break; default:Da();
          }
        } catch (Zb) {}
      }
    } function Da () {
      c.clearRect(0, 0, d.width, d.height); c.lineWidth = 1; c.miterLimit = 1; c.beginPath(); if (F) { for (c.moveTo(0, 0), a = 0; a < q.length / 2; a += 1) { c.lineTo(q[a] * d.width / 255, a * d.height / q.length * 2); } } else { c.moveTo(0, d.height); for (var a = 0; a < q.length / 2; a += 1) { c.lineTo(a * d.width / q.length * 2, d.height - q[a] * d.height / 255 + 2); } }c.strokeStyle = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', 1.0)';
      c.stroke(); c.closePath();
    } function S (a, b, c, k, d, f) {
      a.beginPath(); var h = k; c = typeof c !== 'undefined' ? c : 0.5; h = h || !1; d = d || 16; var g = []; var e; k = b.slice(0); h ? (k.unshift(b[b.length - 1]), k.unshift(b[b.length - 2]), k.unshift(b[b.length - 1]), k.unshift(b[b.length - 2]), k.push(b[0]), k.push(b[1])) : (k.unshift(b[1]), k.unshift(b[0]), k.push(b[b.length - 2]), k.push(b[b.length - 1])); for (e = 2; e < k.length - 4; e += 2) {
        for (h = 0; h <= d; h++) {
          var wa = (k[e + 2] - k[e - 2]) * c; var z = (k[e + 4] - k[e]) * c; var n = (k[e + 3] - k[e - 1]) * c; var l = (k[e + 5] - k[e + 1]) * c; var m = h / d; var p =
	2 * Math.pow(m, 3) - 3 * Math.pow(m, 2) + 1; var q = -(2 * Math.pow(m, 3)) + 3 * Math.pow(m, 2); var r = Math.pow(m, 3) - 2 * Math.pow(m, 2) + m; m = Math.pow(m, 3) - Math.pow(m, 2); wa = p * k[e] + q * k[e + 2] + r * wa + m * z; n = p * k[e + 1] + q * k[e + 3] + r * n + m * l; g.push(wa); g.push(n);
        }
      }a.moveTo(g[0], g[1]); for (oa = 2; oa < g.length - 1; oa += 2) { a.lineTo(g[oa], g[oa + 1]); } if (f) { for (a.beginPath(), f = 0; f < b.length - 1; f += 2) { a.rect(b[f] - 2, b[f + 1] - 2, 4, 4); } }
    } function T (a) {
      var b = ''; if (typeof a !== 'undefined') {
        var h = 0; /[^A-Za-z0-9\+\/=]/g.exec(a); a = a.replace(/[^A-Za-z0-9\+\/=]/g, ''); do {
          var c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.indexOf(a.charAt(h++));
          var k = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.indexOf(a.charAt(h++)); var d = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.indexOf(a.charAt(h++)); var f = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.indexOf(a.charAt(h++)); c = c << 2 | k >> 4; k = (k & 15) << 4 | d >> 2; var g = (d & 3) << 6 | f; b += String.fromCharCode(c); d != 64 && (b += String.fromCharCode(k)); f != 64 && (b += String.fromCharCode(g));
        } while (h < a.length);
      } return unescape(b);
    } function ea (a) {
      var b = 0; var h = ''; do {
        h +=
	String.fromCharCode(a.charCodeAt(b++) - 1);
      } while (b < a.length - 1);return h;
    } function za () {
      for (var a = window.location.href.toString().toLocaleLowerCase(), b = ea(T($b)).toString(), c = [46, 102, 108, 97, 115, 104, 114, 97, 100, 105, 111, 46, 105, 110, 102, 111], d = [46, 115, 111, 100, 97, 104, 46, 100, 101], f = '', g = '', e = 0; e < c.length; e++) { f += String.fromCharCode(c[e]); } for (e = 0; e < d.length; e++) { g += String.fromCharCode(d[e]); } if ($b != '' && a.indexOf(b) != -1 && b.length > 4 || a.indexOf(f) != -1 || a.indexOf(g) != -1) {
        V(), ac(), song_timer = setInterval(() => { ac(); },
          bc), Qa = !0;
      } else { a = [80, 76, 69, 65, 83, 69, 32, 71, 69, 84, 32, 84, 72, 69, 32, 84, 79, 75, 69, 78, 32, 79, 78, 32, 87, 87, 87, 46, 70, 76, 65, 83, 72, 82, 65, 68, 73, 79, 46, 73, 78, 70, 79, 47, 82, 69, 71, 73, 83, 84, 69, 82]; Qa = !1; setTimeout(() => { W(); }, 2E3); v = ''; for (e = 0; e < a.length; e++) { v += String.fromCharCode(a[e]); }x == 'small' ? k() : (e = v.split(' - '), e.length > 0 ? (M = e[0], N = e[1]) : (M = v, N = ''), aa(), J()); }
    } function Ca () {
      switch (Ra) {
        case 'icecast2':var a = U + pa; break; case 'shoutcast2':a = U + cc; break; case 'radionomy':a = U; break; case 'radiojar':a = U; break; default:a =
	U + dc;
      }D('Streaming URL: ' + a); return a;
    } function Ka () { var b = 'https://api.radionomy.com/currentsong.cfm?radiouid=' + gb + '&apikey=' + hb + '&callmeback=yes&type=xml&cover=no&previous=yes'; D(b); a.ajax({ dataType: 'xml', url: b, crossDomain: !0, success: function (b) { Y = a(b).find('radioname').text(); x == 'small' ? X() : ka(); } }); } function ua () {
      var b = r.toLowerCase() == 'none' || r.toLowerCase() == 'nothing' || r.toLowerCase() == 'php' ? U + '/stats?sid=' + La + '&json=1&callback=?' : r + U + '/stats?sid=' + La + '&json=1&callback=?'; r.toLowerCase() == 'php'
        ? a.ajax({ dataType: 'text', method: 'POST', crossDomain: !0, url: va + 'fallback.php', data: { url: b, mode: 'fallback' }, success: function (a) { ec(JSON.parse(mc(a))); } }) : a.ajax({ dataType: 'jsonp', url: b, crossDomain: !0, success: function (a) { ec(a); } });
    } function ec (b) { try { Y = a('<div/>').html(b.servertitle).text(), x == 'small' ? X() : ka(); } catch (wa) {} } function mc (a) {
      a = a.replace(/\\n/g, '\\n').replace(/\\'/g, '\\\'').replace(/\\"/g, '\\"').replace(/\\&/g, '\\&').replace(/\\r/g, '\\r').replace(/\\t/g, '\\t').replace(/\\b/g, '\\b').replace(/\\f/g,
        '\\f'); a = a.replace(/[\u0000-\u0019]+/g, ''); return a = a.substr(2, a.length - 3);
    } function nc () { var b = r.toLowerCase() == 'none' || r.toLowerCase() == 'nothing' || r.toLowerCase() == 'php' ? U + '/status-json.xsl' : r + U + '/status-json.xsl'; r.toLowerCase() == 'php' ? a.ajax({ dataType: 'text', method: 'POST', crossDomain: !1, url: va + 'fallback.php', data: { url: b, mode: 'fallback' }, success: function (a) { fc(a); } }) : a.ajax({ dataType: 'text', url: b, crossDomain: !0, success: function (a) { fc(a); } }); } function fc (b) {
      try {
        b = JSON.parse(b); var c = {}; if (b.icestats.source.length ===
	l) { c = b.icestats.source; } else { for (var k = 0; k < b.icestats.source.length; k++) { var h = b.icestats.source[k].listenurl; pa == h.substr(h.length - pa.length, pa.length) && (c = b.icestats.source[k]); } }c.hasOwnProperty('server_name') && (Y = a('<div/>').html(c.server_name).text()); c.hasOwnProperty('title'); x == 'small' ? X() : ka();
      } catch (xc) {}
    } function Ea () {
      if (la == 'true') {
        var c = 'https://itunes.apple.com/search?term=' + encodeURIComponent(v) + '&media=music&limit=1'; D(c); a.ajax({ dataType: 'jsonp',
          url: c,
          success: function (c) {
            var k = ''; c.results.length == 1
              ? (k = c.results[0].artworkUrl100, k = r.toLowerCase() == 'none' || r.toLowerCase() == 'nothing' || r.toLowerCase() == 'php' ? k.replace('100x100', '300x300') : r + k.replace('100x100', '300x300'), ma = c.results[0].trackViewUrl, ib != '' && (ma += '&app=itunes&at=' + ib)) : (k = Fa, ma = ''); O++; O > 2 && (O = 1); a('#' + b + 'coverblurshadow' + O).attr('src', k); a('#' + b + 'imagehit' + O).attr('src', k).on('load', () => {
              O == 1 ? (a('#' + b + 'imagehit1').fadeIn('slow'), a('#' + b + 'imagehit2').fadeOut('slow'), qa() || (a('#' + b + 'coverblurshadow1').fadeIn('slow'), a('#' + b +
	'coverblurshadow2').fadeOut('slow'))) : (a('#' + b + 'imagehit2').fadeIn('slow'), a('#' + b + 'imagehit1').fadeOut('slow'), qa() || (a('#' + b + 'coverblurshadow2').fadeIn('slow'), a('#' + b + 'coverblurshadow1').fadeOut('slow')));
            });
          },
          error: function () {
            cover = Fa; ma = ''; O++; O > 2 && (O = 1); qa() || a('#' + b + 'coverblurshadow' + O).attr('src', cover); a('#' + b + 'imagehit' + O).attr('src', cover).on('load', () => {
              O == 1 ? (a('#' + b + 'imagehit1').fadeIn('slow'), a('#' + b + 'imagehit2').fadeOut('slow'), qa() || (a('#' + b + 'coverblurshadow1').fadeIn('slow'),
              a('#' + b + 'coverblurshadow2').fadeOut('slow'))) : (a('#' + b + 'imagehit2').fadeIn('slow'), a('#' + b + 'imagehit1').fadeOut('slow'), qa() || (a('#' + b + 'coverblurshadow1').fadeOut('slow'), a('#' + b + 'coverblurshadow2').fadeIn('slow')));
            });
          } });
      }
    } function V () {
      la == 'true' && Fa != '' && (O++, O > 2 && (O = 1), a('#' + b + 'coverblurshadow' + O).attr('src', Fa), a('#' + b + 'imagehit' + O).attr('src', Fa).on('load', () => {
        O == 1 ? (a('#' + b + 'imagehit1').fadeIn('slow'), a('#' + b + 'coverblurshadow1').fadeIn('slow'), a('#' + b + 'imagehit2').fadeOut('slow'), a('#' +
	b + 'coverblurshadow2').fadeOut('slow')) : (a('#' + b + 'imagehit2').fadeIn('slow'), a('#' + b + 'coverblurshadow2').fadeIn('slow'), a('#' + b + 'imagehit1').fadeOut('slow'), a('#' + b + 'coverblurshadow1').fadeOut('slow'));
      }));
    } function ac () { if (Sa != '') { oc(); } else { switch (Ra) { case 'icecast2':pc(); break; case 'shoutcast1':qc(); break; case 'shoutcast2':rc(); break; case 'radionomy':sc(); break; case 'radiojar':tc(); } } } function pc () {
      var b = r.toLowerCase() == 'none' || r.toLowerCase() == 'nothing' || r.toLowerCase() == 'php' ? U + '/status-json.xsl'
        : r + U + '/status-json.xsl'; r.toLowerCase() == 'php' ? a.ajax({ dataType: 'text', method: 'POST', crossDomain: !1, url: va + 'fallback.php', data: { url: b, mode: 'fallback' }, success: function (a) { gc(a); }, error: function (a, b, c) { V(); } }) : a.ajax({ dataType: 'text', url: b, crossDomain: !0, success: function (a) { gc(a); }, error: function (a, b, c) { V(); } });
    } function gc (b) {
      try {
        b = JSON.parse(b); var c = {}; if (b.icestats.source.length === l) { c = b.icestats.source; } else {
          for (var h = 0; h < b.icestats.source.length; h++) {
            var d = b.icestats.source[h].listenurl; pa == d.substr(d.length -
	pa.length, pa.length) && (c = b.icestats.source[h]);
          }
        } if (c.hasOwnProperty('title') && v != a('<div/>').html(c.title).text()) { if (v = a('<div/>').html(c.title).text(), Ea(), x == 'small') { k(); } else { var f = v.split(' - '); f.length > 0 ? (M = f[0], N = f[1]) : (M = v, N = ''); aa(); J(); } }
      } catch (lc) { D(lc); }v == '' && V();
    } function qc () {
      var b = r.toLowerCase() == 'none' || r.toLowerCase() == 'nothing' || r.toLowerCase() == 'php' ? U + '/7.html' : r + U + '/7.html'; r.toLowerCase() == 'php' ? a.ajax({ dataType: 'text',
        method: 'POST',
        crossDomain: !1,
        url: va + 'fallback.php',
        data: { url: b,
          mode: 'fallback' },
        success: function (a) {
          var b = []; var c = 0; var k = 0; for (a += ''; c < a.length;) {
            var h = a.charCodeAt(c); if (h <= 191) { b[k++] = String.fromCharCode(h), c++; } else if (h <= 223) { var d = a.charCodeAt(c + 1); b[k++] = String.fromCharCode((h & 31) << 6 | d & 63); c += 2; } else if (h <= 239) { d = a.charCodeAt(c + 1); var f = a.charCodeAt(c + 2); b[k++] = String.fromCharCode((h & 15) << 12 | (d & 63) << 6 | f & 63); c += 3; } else {
              d = a.charCodeAt(c + 1); f = a.charCodeAt(c + 2); var e = a.charCodeAt(c + 3); h = (h & 7) << 18 | (d & 63) << 12 | (f & 63) << 6 | e & 63; h -= 65536; b[k++] = String.fromCharCode(55296 |
	h >> 10 & 1023); b[k++] = String.fromCharCode(56320 | h & 1023); c += 4;
            }
          }b = b.join(''); hc(b);
        },
        error: function (a, b, c) { V(); } }) : a.ajax({ dataType: 'text', url: b, crossDomain: !0, success: function (a) { hc(a); }, error: function (a, b, c) { V(); } });
    } function hc (b) { b = a(b).text(); b = b.split(','); if (b.length > 6) { var c = a('<div/>').html(b[6]).text(); if (b.length > 7) { for (var h = 7; h < b.length; h++) { c += ',' + a('<div/>').html(b[h]).text(); } }v != c && (v = c, Ea(), x == 'small' ? k() : (b = v.split(' - '), b.length > 0 ? (M = b[0], N = b[1]) : (M = v, N = ''), aa(), J())); }v == '' && V(); } function sc () {
      a.ajax({ dataType: 'xml',
        url: 'https://api.radionomy.com/currentsong.cfm?radiouid=' + gb + '&apikey=' + hb + '&callmeback=yes&type=xml&cover=yes&previous=yes',
        crossDomain: !0,
        success: function (b) { var c = a(b).find('track').find('artists').text(); a(b).find('track').find('title').text() != a(b).find('track').find('artists').text() && (c += ' - ' + a(b).find('track').find('title').text()); v != c && (v = c, Ea(), x == 'small' ? k() : (b = v.split(' - '), b.length > 0 ? (M = b[0], N = b[1]) : (M = v, N = ''), aa(), J())); v == '' && V(); },
        error: function (a, b, c) { V(); } });
    } function tc () {
      a.ajax({ type: 'GET',
        crossDomain: !0,
        cache: !1,
        url: '//www.radiojar.com/api/stations/' + uc + '/now_playing/?rand=' + Math.random(),
        dataType: 'jsonp',
        async: !0,
        success: function (a) { if (a) { try { var b = a.artist + ' - ' + a.title; v != b && (v = b, Ea(), x == 'small' ? k() : (M = a.artist, N = a.title, aa(), J())); } catch (z) {} } },
        error: function (a, b, c) {} });
    } function rc () {
      var b = r.toLowerCase() == 'none' || r.toLowerCase() == 'nothing' || r.toLowerCase() == 'php' ? U + '/currentsong?sid=' + La : r + U + '/currentsong?sid=' + La; r.toLowerCase() == 'php' ? a.ajax({ dataType: 'text',
        method: 'POST',
        crossDomain: !1,
        url: va + 'fallback.php',
        data: { url: b, mode: 'fallback' },
        success: function (a) { ic(a); },
        error: function (a, b, c) { V(); } }) : a.ajax({ dataType: 'text', url: b, crossDomain: !0, success: function (a) { ic(a); }, error: function (a, b, c) { V(); } });
    } function ic (a) { v != a && (v = a, Ea(), x == 'small' ? k() : (a = v.split(' - '), a.length > 0 ? (M = a[0], N = a[1]) : (M = v, N = ''), aa(), J())); v == '' && V(); } function oc () {
      var b = r.toLowerCase() == 'none' || r.toLowerCase() == 'nothing' || r.toLowerCase() == 'php' ? Sa : r + Sa; r.toLowerCase() == 'php' ? a.ajax({ dataType: 'text',
        method: 'POST',
        crossDomain: !1,
        url: va + 'fallback.php',
        data: { url: b, mode: 'fallback' },
        success: function (a) { jc(a); },
        error: function (a, b, c) { V(); } }) : a.ajax({ dataType: 'text', url: b, crossDomain: !0, success: function (a) { jc(a); }, error: function (a, b, c) { V(); } });
    } function jc (b) { try { if (v != a('<div/>').html(b).text()) { if (v = a('<div/>').html(b).text(), Ea(), x == 'small') { k(); } else { var c = v.split(' - '); c.length > 0 ? (M = c[0], N = c[1]) : (M = v, N = ''); aa(); J(); } } } catch (z) {}v == '' && V(); } function D (a) { kc && window.console && console.log(a); } function p (a) {
      return (a = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(a))
        ? { r: parseInt(a[1], 16), g: parseInt(a[2], 16), b: parseInt(a[3], 16) } : null;
    } function qa () { return navigator.userAgent.search(/MSIE|Trident/) >= 0; } function Ga () { return !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform); } function Pb () { return /^((?!chrome|android).)*safari/i.test(navigator.userAgent); } var vc = g.id; if (arguments.length) { this.element = a(g); this.options = a.extend(!0, {}, this.options, e); var wc = this; this.element.bind('remove.flashradio', () => { wc.destroy(); }); } for (var $b = e.token, uc = e.radiojar,
      jb = e.radiouid, kb = e.apikey, lb = e.corsproxy, mb = e.streamprefix, nb = e.streamurl, ob = e.streampath, pb = e.streamid, qb = e.mountpoint, rb = e.streamtype, sb = e.themefontcolor, tb = e.themecolor, ub = e.radioname, vb = e.scroll, wb = e.autoplay, xb = e.debug, yb = e.ownsongtitleurl, zb = e.startvolume, Ab = e.songinformationinterval, Bb = e.titlefontname, Cb = e.titlegooglefontname, Db = e.songfontname, Eb = e.songgooglefontname, Fb = e.useanalyzer, Gb = e.analyzertype, Hb = e.radiocover, Ib = e.usecover, Jb = e.affiliatetoken, Kb = e.usestreamcorsproxy, Lb = e.userinterface,
      Mb = e.backgroundcolor, b, Va, E, ya, cb, db, Ma, ra, Oa, $a, ab, gb = '', hb = '', r = 'none', dc = '/;type=mp3', U = 'http://streaming.radionomy.com/JamendoLounge', cc = '', La = '', pa = '', Ra = 'other', H = '#FFFFFF', m = '#0d72bf', Y = '', sa = 'AUTO', eb = !1, kc = !1, Sa = '', Wa, Nb, na = !1, F = !1, Pa, ha, y, C = 75, xa, bc = 2E4, Na = '', Ta = '', ia = '', Ua = '', Fa = 'data:image/png;base64,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',
      la = 'true', ib = '1000lIPN', Tb = '', Xa, Ya, Ba = !1, Aa = !1, O = 2, Vb, Ia, d, ta, c, Wb, Za, v = '', q = [], da = 'nothing', ja = '1', x = 'small', u = [], ma = '', Yb = 'false', fa = '', Qb = '', M = ' ', Rb = '', N = '', K = [], fb = 0, Ja = [], oa = 0; oa < 511; oa += 1) { Ja.push(Math.floor(254 / (oa / 100 + 1) * Math.random() + 1)); } var f = 0; var n = 0; var Ob = 0; var Ub; var Sb; var L; var Xb; var bb; var va; var Qa = !0; a(document).ready(() => {
      b = vc; var a = document.getElementsByTagName('script'); var c; var k; for (c = 0; k = a[c]; c++) { if (k = k.src, k.indexOf('nativeflashradiov4.js') >= 0) { var d = k.substring(0, k.indexOf('nativeflashradiov4.js')); } }va = d;
      lb != l && lb.toString() != '' && (r = lb.toString()); kb != l && kb.toString() != '' && (hb = kb.toString()); jb != l && jb.toString() != '' && (gb = jb.toString()); mb != l && mb.toString() != '' && (dc = mb.toString()); nb != l && nb.toString() != '' && (U = nb.toString()); ob != l && ob.toString() != '' && (cc = ob.toString()); pb != l && pb.toString() != '' && (La = pb.toString()); qb != l && qb.toString() != '' && (pa = qb.toString()); rb != l && rb.toString() != '' && (Ra = rb.toString().toLowerCase()); sb != l && sb.toString() != '' && (H = sb.toString()); tb != l && tb.toString() != '' && (m = tb.toString());
      Ib != l && Ib.toString() != '' && (la = Ib.toString().toLowerCase()); Kb != l && Kb.toString() != '' && (Yb = Kb.toString().toLowerCase()); Jb != l && Jb.toString() != '' && (ib = Jb.toString()); Lb != l && Lb.toString() != '' && (x = Lb.toString().toLowerCase()); if (Mb != l && Mb.toString() != '') { Wa = Mb.toString().toLowerCase(); } else {
        a = m; c = -0.9; a = String(a).replace(/[^0-9a-f]/gi, ''); a.length < 6 && (a = a[0] + a[0] + a[1] + a[1] + a[2] + a[2]); c = c || 0; d = '#'; var f; for (f = 0; f < 3; f++) {
          k = parseInt(a.substr(2 * f, 2), 16), k = Math.round(Math.min(Math.max(0, k + k * c), 255)).toString(16),
          d += ('00' + k).substr(k.length);
        }Wa = d;
      }Nb = 'rgba(' + p(m).r + ', ' + p(m).g + ', ' + p(m).b + ', 0.6)'; d = H; d = d.replace('#', ''); a = parseInt(d.substr(0, 2), 16); c = parseInt(d.substr(2, 2), 16); d = parseInt(d.substr(4, 2), 16); fa = (299 * a + 587 * c + 114 * d) / 1E3 < 127 ? '#ffffff' : '#000000'; if (ub != l && ub.toString() != '') { Y = ub.toString(); } else { switch (Ra) { case 'icecast2':nc(); break; case 'shoutcast2':ua(); break; case 'radionomy':Ka(); } }vb != l && vb.toString() != '' && (sa = vb.toString().toLowerCase()); wb != l && wb.toString() != '' && (eb = wb.toString().toLowerCase() == 'true'
        ? !0 : !1); xb != l && xb.toString() != '' && (kc = xb.toString().toLowerCase() == 'true' ? !0 : !1); yb != l && yb.toString() != '' && (a = yb.toString(), /^(f|ht)tps?:\/\//i.test(a) || (a = 'http://' + a), Sa = a); zb != l && zb.toString() != '' && (C = parseInt(zb.toString())); Ab != l && Ab.toString() != '' && (bc = parseInt(Ab.toString())); Bb != l && Bb.toString() != '' && (Na = Bb.toString()); Cb != l && Cb.toString() != '' && (Ta = Cb.toString()); Db != l && Db.toString() != '' && (ia = Db.toString()); Eb != l && Eb.toString() != '' && (Ua = Eb.toString()); Fb != l && Fb.toString() != '' && (da = Fb.toString().toLowerCase());
      Gb != l && Gb.toString() != '' && (ja = Gb.toString()); Hb != l && Hb.toString() != '' && (Fa = Hb.toString()); Ga() && (C = 100); da == 'real' && Pb() && (da = 'fake'); G();
    }); this.stopradio = function () { W(); }; this.startradio = function () { Z(); }; this.setvolume = function (a) { C = parseInt(a); B(); Q(C); }; html5audiocheck = function () {
      var a = !1; try { var b = document.createElement('audio'); a = !(!b.canPlayType || !b.canPlayType('audio/mpeg;').replace(/no/, '')); } catch (z) { a = !1; }a && (a = /chrome/.test(navigator.userAgent.toLowerCase()) || /Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent) ||
	/OPR\/(\d+\.\d+)/i.test(navigator.userAgent) || /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ? !0 : !1); return a;
    }; mobilecheck = function () { return navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i) || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/BlackBerry/i) || navigator.userAgent.match(/Windows Phone/i) ? !0 : !1; };
  };
});
(function (a) {
  function l (k, e, l) { if (e.substr(0, 5) !== 'touch') { return a(k).unbind(e, l); } var t; for (t = 0; t < g._binds.length; t++) { g._binds[t].elem === k && g._binds[t].type === e && g._binds[t].func === l && (document.addEventListener ? k.removeEventListener(e, g._binds[t].fnc, !1) : k.detachEvent('on' + e, g._binds[t].fnc), g._binds.splice(t--, 1)); } } function g (k, e, l, t) {
    if (e.substr(0, 5) !== 'touch') { return a(k).bind(e, t, l); } if (g[e]) { return g[e].bind(k, e, l, t); } var G = function (a) {
      a || (a = window.event); a.stopPropagation || (a.stopPropagation = function () {
        this.cancelBubble =
	!0;
      }); a.data = t; l.call(k, a);
    }; document.addEventListener ? k.addEventListener(e, G, !1) : k.attachEvent('on' + e, G); g._binds.push({ elem: k, type: e, func: l, fnc: G });
  } function e (a) {
    a.data.position.x = a.pageX; a.data.position.y = a.pageY; a.data.start.x = a.pageX; a.data.start.y = a.pageY; a.data.event = a; a.data.onstart && a.data.onstart.call(a.data.element, a.data) || (a.preventDefault && a.data.preventDefault && a.preventDefault(), a.stopPropagation && a.data.stopPropagation && a.stopPropagation(), g(a.data.affects, aa, t, a.data), g(a.data.affects,
      J, G, a.data));
  } function t (a) { a.preventDefault && a.data.preventDefault && a.preventDefault(); a.stopPropagation && a.data.preventDefault && a.stopPropagation(); a.data.move.x = a.pageX - a.data.position.x; a.data.move.y = a.pageY - a.data.position.y; a.data.position.x = a.pageX; a.data.position.y = a.pageY; a.data.offset.x = a.pageX - a.data.start.x; a.data.offset.y = a.pageY - a.data.start.y; a.data.event = a; a.data.onmove && a.data.onmove.call(a.data.element, a.data); } function G (a) {
    a.preventDefault && a.data.preventDefault && a.preventDefault();
    a.stopPropagation && a.data.stopPropagation && a.stopPropagation(); l(a.data.affects, aa, t); l(a.data.affects, J, G); a.data.event = a; a.data.onfinish && a.data.onfinish.call(a.data.element, a.data);
  } function B (a) {
    a.data.position.x = a.touches[0].pageX; a.data.position.y = a.touches[0].pageY; a.data.start.x = a.touches[0].pageX; a.data.start.y = a.touches[0].pageY; a.data.event = a; a.data.onstart && a.data.onstart.call(a.data.element, a.data) || (a.preventDefault && a.data.preventDefault && a.preventDefault(), a.stopPropagation && a.data.stopPropagation &&
	a.stopPropagation(), g(a.data.affects, X, Q, a.data), g(a.data.affects, ba, R, a.data));
  } function Q (a) {
    a.preventDefault && a.data.preventDefault && a.preventDefault(); a.stopPropagation && a.data.stopPropagation && a.stopPropagation(); a.data.move.x = a.touches[0].pageX - a.data.position.x; a.data.move.y = a.touches[0].pageY - a.data.position.y; a.data.position.x = a.touches[0].pageX; a.data.position.y = a.touches[0].pageY; a.data.offset.x = a.touches[0].pageX - a.data.start.x; a.data.offset.y = a.touches[0].pageY - a.data.start.y; a.data.event =
	a; a.data.onmove && a.data.onmove.call(a.data.elem, a.data);
  } function R (a) { a.preventDefault && a.data.preventDefault && a.preventDefault(); a.stopPropagation && a.data.stopPropagation && a.stopPropagation(); l(a.data.affects, X, Q); l(a.data.affects, ba, R); a.data.event = a; a.data.onfinish && a.data.onfinish.call(a.data.element, a.data); } var ka = a.extend; var aa = 'mousemove'; var J = 'mouseup'; var X = 'touchmove'; var ba = 'touchend'; g._binds = []; a.fn.grab = function (a, l) {
    return this.each(function () {
      var k = { move: { x: 0, y: 0 },
        offset: { x: 0, y: 0 },
        position: { x: 0,
          y: 0 },
        start: { x: 0, y: 0 },
        affects: document.documentElement,
        stopPropagation: !1,
        preventDefault: !0,
        touch: !0 }; ka(k, a); k.element = this; g(this, 'mousedown', e, k); k.touch && g(this, 'touchstart', B, k);
    });
  }; a.fn.ungrab = function (a) { return this.each(function () { l(this, 'mousedown', 'mousedown'); }); };
})(jQuery);
jQuery.fn.extend({ disableSelection: function () {
  this.each(function () {
    this.onselectstart = function () { return !1; }; this.onmousedown = function (a) { return !1; }; this.unselectable = 'on'; jQuery(this).css('-moz-user-select', 'none'); jQuery(this).css('-webkit-user-select', 'none'); jQuery(this).css('-webkit-touch-callout', 'none'); jQuery(this).css('-khtml-user-select', 'none'); jQuery(this).css('-ms-user-select', 'none'); jQuery(this).css('user-select', 'none'); jQuery(this).css('tap-highlight-color', 'rgba(0, 0, 0, 0)'); jQuery(this).css('-o-tap-highlight-color',
      'rgba(0, 0, 0, 0)'); jQuery(this).css('-moz-tap-highlight-color', 'rgba(0, 0, 0, 0)'); jQuery(this).css('-webkit-tap-highlight-color', 'rgba(0, 0, 0, 0)');
  });
} });
(function (a) {
  var l = document.createElement('div'); l = l.style; var g = a.support; g.transform = l.MozTransform === '' ? 'MozTransform' : l.MsTransform === '' ? 'MsTransform' : l.WebkitTransform === '' ? 'WebkitTransform' : l.OTransform === '' ? 'OTransform' : l.transform === '' ? 'transform' : !1; g.matrixFilter = !g.transform && l.filter === ''; l = null; a.cssNumber.rotate = !0; a.cssHooks.rotate = { set: function (e, l) {
    var t = g.transform; if (typeof l === 'string') {
      var B = l; l = ~B.indexOf('deg') ? parseInt(B, 10) * (2 * Math.PI / 360) : ~B.indexOf('grad') ? parseInt(B, 10) *
	(Math.PI / 200) : parseFloat(B);
    }a.data(e, 'transform', { rotate: l }); t ? e.style[t] = 'rotate(' + l + 'rad)' : g.matrixFilter && (t = Math.cos(l), B = Math.sin(l), e.style.filter = ['progid:DXImageTransform.Microsoft.Matrix(', 'M11=' + t + ',', 'M12=' + -B + ',', 'M21=' + B + ',', 'M22=' + t + ',', 'SizingMethod=\'auto expand\')'].join(''), t = a.rotate.centerOrigin) && (e.style[t == 'margin' ? 'marginLeft' : 'left'] = -(e.offsetWidth / 2) + e.clientWidth / 2 + 'px', e.style[t == 'margin' ? 'marginTop' : 'top'] = -(e.offsetHeight / 2) + e.clientHeight / 2 + 'px');
  },
  get: function (e, g) {
    var l =
	a.data(e, 'transform'); return l && l.rotate ? l.rotate : 0;
  } }; a.fx.step.rotate = function (e) { a.cssHooks.rotate.set(e.elem, e.now + e.unit); }; a.rotate = { centerOrigin: 'margin', radToDeg: function (a) { return 180 * a / Math.PI; } };
})(jQuery);
(function (a) {
  a.fn.marquee = function (l) {
    return this.each(function () {
      var g = a.extend({}, a.fn.marquee.defaults, l); var e = a(this); var t; var G; var B = 3; var Q = 'animation-play-state'; var R = !1; var ka = function (a, e, g) { for (var k = ['webkit', 'moz', 'MS', 'o', ''], l = 0; l < k.length; l++) { k[l] || (e = e.toLowerCase()), a.addEventListener(k[l] + e, g, !1); } }; var aa = function (a) { var e = []; var g; for (g in a) { a.hasOwnProperty(g) && e.push(g + ':' + a[g]); }e.push(); return '{' + e.join(',') + '}'; }; var J = { pause: function () {
        R && g.allowCss3Support ? t.css(Q, 'paused') : a.fn.pause && t.pause(); e.data('runningStatus',
          'paused'); e.trigger('paused');
      },
      resume: function () { R && g.allowCss3Support ? t.css(Q, 'running') : a.fn.resume && t.resume(); e.data('runningStatus', 'resumed'); e.trigger('resumed'); },
      toggle: function () { J[e.data('runningStatus') == 'resumed' ? 'pause' : 'resume'](); },
      destroy: function () { clearTimeout(e.timer); e.find('*').addBack().unbind(); e.html(e.find('.js-marquee:first').html()); } }; if (typeof l === 'string') { a.isFunction(J[l]) && (t || (t = e.find('.js-marquee-wrapper')), !0 === e.data('css3AnimationIsSupported') && (R = !0), J[l]()); } else {
        var X;
        a.each(g, (a, k) => { X = e.attr('data-' + a); if (typeof X !== 'undefined') { switch (X) { case 'true':X = !0; break; case 'false':X = !1; }g[a] = X; } }); g.speed && (g.duration = parseInt(e.width(), 10) / g.speed * 1E3); var ba = g.direction == 'up' || g.direction == 'down'; g.gap = g.duplicated ? parseInt(g.gap) : 0; e.wrapInner('<div class="js-marquee"></div>'); var k = e.find('.js-marquee').css({ 'margin-right': g.gap, float: 'left' }); g.duplicated && k.clone(!0).appendTo(e); e.wrapInner('<div style="width:100000px" class="js-marquee-wrapper"></div>');
        t = e.find('.js-marquee-wrapper'); if (ba) { var P = e.height(); t.removeAttr('style'); e.height(P); e.find('.js-marquee').css({ float: 'none', 'margin-bottom': g.gap, 'margin-right': 0 }); g.duplicated && e.find('.js-marquee:last').css({ 'margin-bottom': 0 }); var Z = e.find('.js-marquee:first').height() + g.gap; g.startVisible && !g.duplicated ? (g._completeDuration = (parseInt(Z, 10) + parseInt(P, 10)) / parseInt(P, 10) * g.duration, g.duration *= parseInt(Z, 10) / parseInt(P, 10)) : g.duration *= (parseInt(Z, 10) + parseInt(P, 10)) / parseInt(P, 10); } else {
          var ca =
	e.find('.js-marquee:first').width() + g.gap; var W = e.width(); g.startVisible && !g.duplicated ? (g._completeDuration = (parseInt(ca, 10) + parseInt(W, 10)) / parseInt(W, 10) * g.duration, g.duration *= parseInt(ca, 10) / parseInt(W, 10)) : g.duration *= (parseInt(ca, 10) + parseInt(W, 10)) / parseInt(W, 10);
        }g.duplicated && (g.duration /= 2); if (g.allowCss3Support) {
          k = document.body || document.createElement('div'); var I = 'marqueeAnimation-' + Math.floor(1E7 * Math.random()); var Da = ['Webkit', 'Moz', 'O', 'ms', 'Khtml']; var S = 'animation'; var T = ''; var ea = ''; k.style.animation &&
	(ea = '@keyframes ' + I + ' ', R = !0); if (!1 === R) { for (var za = 0; za < Da.length; za++) { if (void 0 !== k.style[Da[za] + 'AnimationName']) { k = '-' + Da[za].toLowerCase() + '-'; S = k + S; Q = k + Q; ea = '@' + k + 'keyframes ' + I + ' '; R = !0; break; } } }R && (T = I + ' ' + g.duration / 1E3 + 's ' + g.delayBeforeStart / 1E3 + 's infinite ' + g.css3easing, e.data('css3AnimationIsSupported', !0));
        } var Ca = function () { t.css('transform', 'translateY(' + (g.direction == 'up' ? P + 'px' : '-' + Z + 'px') + ')'); }; var Ka = function () { t.css('transform', 'translateX(' + (g.direction == 'left' ? W + 'px' : '-' + ca + 'px') + ')'); };
        g.duplicated ? (ba ? g.startVisible ? t.css('transform', 'translateY(0)') : t.css('transform', 'translateY(' + (g.direction == 'up' ? P + 'px' : '-' + (2 * Z - g.gap) + 'px') + ')') : g.startVisible ? t.css('transform', 'translateX(0)') : t.css('transform', 'translateX(' + (g.direction == 'left' ? W + 'px' : '-' + (2 * ca - g.gap) + 'px') + ')'), g.startVisible || (B = 1)) : g.startVisible ? B = 2 : ba ? Ca() : Ka(); var ua = function () {
          g.duplicated && (B === 1 ? (g._originalDuration = g.duration, g.duration = ba ? g.direction == 'up' ? g.duration + P / (Z / g.duration) : 2 * g.duration : g.direction == 'left'
            ? g.duration + W / (ca / g.duration) : 2 * g.duration, T && (T = I + ' ' + g.duration / 1E3 + 's ' + g.delayBeforeStart / 1E3 + 's ' + g.css3easing), B++) : B === 2 && (g.duration = g._originalDuration, T && (I += '0', ea = a.trim(ea) + '0 ', T = I + ' ' + g.duration / 1E3 + 's 0s infinite ' + g.css3easing), B++)); ba ? g.duplicated ? (B > 2 && t.css('transform', 'translateY(' + (g.direction == 'up' ? 0 : '-' + Z + 'px') + ')'), G = { transform: 'translateY(' + (g.direction == 'up' ? '-' + Z + 'px' : 0) + ')' }) : g.startVisible ? B === 2 ? (T && (T = I + ' ' + g.duration / 1E3 + 's ' + g.delayBeforeStart / 1E3 + 's ' + g.css3easing),
          G = { transform: 'translateY(' + (g.direction == 'up' ? '-' + Z + 'px' : P + 'px') + ')' }, B++) : B === 3 && (g.duration = g._completeDuration, T && (I += '0', ea = a.trim(ea) + '0 ', T = I + ' ' + g.duration / 1E3 + 's 0s infinite ' + g.css3easing), Ca()) : (Ca(), G = { transform: 'translateY(' + (g.direction == 'up' ? '-' + t.height() + 'px' : P + 'px') + ')' }) : g.duplicated ? (B > 2 && t.css('transform', 'translateX(' + (g.direction == 'left' ? 0 : '-' + ca + 'px') + ')'), G = { transform: 'translateX(' + (g.direction == 'left' ? '-' + ca + 'px' : 0) + ')' }) : g.startVisible ? B === 2 ? (T && (T = I + ' ' + g.duration / 1E3 + 's ' +
	g.delayBeforeStart / 1E3 + 's ' + g.css3easing), G = { transform: 'translateX(' + (g.direction == 'left' ? '-' + ca + 'px' : W + 'px') + ')' }, B++) : B === 3 && (g.duration = g._completeDuration, T && (I += '0', ea = a.trim(ea) + '0 ', T = I + ' ' + g.duration / 1E3 + 's 0s infinite ' + g.css3easing), Ka()) : (Ka(), G = { transform: 'translateX(' + (g.direction == 'left' ? '-' + ca + 'px' : W + 'px') + ')' }); e.trigger('beforeStarting'); if (R) {
            t.css(S, T); var k = ea + ' { 100%  ' + aa(G) + '}'; var l = t.find('style'); l.length !== 0 ? l.filter(':last').html(k) : a('head').append('<style>' + k + '</style>');
            ka(t[0], 'AnimationIteration', () => { e.trigger('finished'); }); ka(t[0], 'AnimationEnd', () => { ua(); e.trigger('finished'); });
          } else { t.animate(G, g.duration, g.easing, () => { e.trigger('finished'); g.pauseOnCycle ? e.timer = setTimeout(ua, g.delayBeforeStart) : ua(); }); }e.data('runningStatus', 'resumed');
        }; e.bind('pause', J.pause); e.bind('resume', J.resume); g.pauseOnHover && (e.bind('mouseenter', J.pause), e.bind('mouseleave', J.resume)); R && g.allowCss3Support ? ua() : e.timer = setTimeout(ua, g.delayBeforeStart);
      }
    });
  }; a.fn.marquee.defaults =
	{ allowCss3Support: !0, css3easing: 'linear', easing: 'linear', delayBeforeStart: 1E3, direction: 'left', duplicated: !1, duration: 5E3, gap: 20, pauseOnCycle: !1, pauseOnHover: !1, startVisible: !1 };
})(jQuery);
