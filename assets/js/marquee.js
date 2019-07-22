/**
 * jQuery.marquee - scrolling text like old marquee element
 * @author Aamir Afridi - aamirafridi(at)gmail(dot)com / http://aamirafridi.com/jquery/jquery-marquee-plugin
 */
(function (f) {
  f.fn.marquee = function (x) {
    return this.each(function () {
      var a = f.extend({}, f.fn.marquee.defaults, x); var b = f(this); var c; var t; var e = 3; var y = `animation-play-state`; var p = !1; var E = function (a, b, c) { for (var e = [`webkit`, `moz`, `MS`, `o`, ``], d = 0; d < e.length; d++) { e[d] || (b = b.toLowerCase()), a.addEventListener(e[d] + b, c, !1) } }; var F = function (a) { var b = []; var c; for (c in a) { a.hasOwnProperty(c) && b.push(c + `:` + a[c]) }b.push(); return `{` + b.join(`,`) + `}` }; var l = { pause: function () {
        p && a.allowCss3Support ? c.css(y, `paused`) : f.fn.pause && c.pause(); b.data(`runningStatus`,
          `paused`); b.trigger(`paused`)
      },
      resume: function () { p && a.allowCss3Support ? c.css(y, `running`) : f.fn.resume && c.resume(); b.data(`runningStatus`, `resumed`); b.trigger(`resumed`) },
      toggle: function () { l[b.data(`runningStatus`) == `resumed` ? `pause` : `resume`]() },
      destroy: function () { clearTimeout(b.timer); b.find(`*`).addBack().unbind(); b.html(b.find(`.js-marquee:first`).html()) } }; if (typeof x === `string`) { f.isFunction(l[x]) && (c || (c = b.find(`.js-marquee-wrapper`)), !0 === b.data(`css3AnimationIsSupported`) && (p = !0), l[x]()) } else {
        var u
        f.each(a, (c, d) => { u = b.attr(`data-` + c); if (typeof u !== `undefined`) { switch (u) { case `true`:u = !0; break; case `false`:u = !1 }a[c] = u } }); a.speed && (a.duration = parseInt(b.width(), 10) / a.speed * 1E3); var v = a.direction == `up` || a.direction == `down`; a.gap = a.duplicated ? parseInt(a.gap) : 0; b.wrapInner(`<div class="js-marquee"></div>`); var h = b.find(`.js-marquee`).css({ 'margin-right': a.gap, float: `left` }); a.duplicated && h.clone(!0).appendTo(b); b.wrapInner(`<div style="width:100000px" class="js-marquee-wrapper"></div>`)
        c = b.find(`.js-marquee-wrapper`); if (v) { var k = b.height(); c.removeAttr(`style`); b.height(k); b.find(`.js-marquee`).css({ float: `none`, 'margin-bottom': a.gap, 'margin-right': 0 }); a.duplicated && b.find(`.js-marquee:last`).css({ 'margin-bottom': 0 }); var q = b.find(`.js-marquee:first`).height() + a.gap; a.startVisible && !a.duplicated ? (a._completeDuration = (parseInt(q, 10) + parseInt(k, 10)) / parseInt(k, 10) * a.duration, a.duration *= parseInt(q, 10) / parseInt(k, 10)) : a.duration *= (parseInt(q, 10) + parseInt(k, 10)) / parseInt(k, 10) } else {
          var m =
b.find(`.js-marquee:first`).width() + a.gap; var n = b.width(); a.startVisible && !a.duplicated ? (a._completeDuration = (parseInt(m, 10) + parseInt(n, 10)) / parseInt(n, 10) * a.duration, a.duration *= parseInt(m, 10) / parseInt(n, 10)) : a.duration *= (parseInt(m, 10) + parseInt(n, 10)) / parseInt(n, 10)
        }a.duplicated && (a.duration /= 2); if (a.allowCss3Support) {
          h = document.body || document.createElement(`div`); var g = `marqueeAnimation-` + Math.floor(1E7 * Math.random()); var A = [`Webkit`, `Moz`, `O`, `ms`, `Khtml`]; var B = `animation`; var d = ``; var r = ``; h.style.animation &&
(r = `@keyframes ` + g + ` `, p = !0); if (!1 === p) { for (var z = 0; z < A.length; z++) { if (void 0 !== h.style[A[z] + `AnimationName`]) { h = `-` + A[z].toLowerCase() + `-`; B = h + B; y = h + y; r = `@` + h + `keyframes ` + g + ` `; p = !0; break } } }p && (d = g + ` ` + a.duration / 1E3 + `s ` + a.delayBeforeStart / 1E3 + `s infinite ` + a.css3easing, b.data(`css3AnimationIsSupported`, !0))
        } var C = function () { c.css(`transform`, `translateY(` + (a.direction == `up` ? k + `px` : `-` + q + `px`) + `)`) }; var D = function () { c.css(`transform`, `translateX(` + (a.direction == `left` ? n + `px` : `-` + m + `px`) + `)`) }; a.duplicated
          ? (v ? a.startVisible ? c.css(`transform`, `translateY(0)`) : c.css(`transform`, `translateY(` + (a.direction == `up` ? k + `px` : `-` + (2 * q - a.gap) + `px`) + `)`) : a.startVisible ? c.css(`transform`, `translateX(0)`) : c.css(`transform`, `translateX(` + (a.direction == `left` ? n + `px` : `-` + (2 * m - a.gap) + `px`) + `)`), a.startVisible || (e = 1)) : a.startVisible ? e = 2 : v ? C() : D(); var w = function () {
          a.duplicated && (e === 1 ? (a._originalDuration = a.duration, a.duration = v ? a.direction == `up` ? a.duration + k / (q / a.duration) : 2 * a.duration : a.direction == `left` ? a.duration + n /
(m / a.duration) : 2 * a.duration, d && (d = g + ` ` + a.duration / 1E3 + `s ` + a.delayBeforeStart / 1E3 + `s ` + a.css3easing), e++) : e === 2 && (a.duration = a._originalDuration, d && (g += `0`, r = f.trim(r) + `0 `, d = g + ` ` + a.duration / 1E3 + `s 0s infinite ` + a.css3easing), e++)); v ? a.duplicated ? (e > 2 && c.css(`transform`, `translateY(` + (a.direction == `up` ? 0 : `-` + q + `px`) + `)`), t = { transform: `translateY(` + (a.direction == `up` ? `-` + q + `px` : 0) + `)` }) : a.startVisible ? e === 2 ? (d && (d = g + ` ` + a.duration / 1E3 + `s ` + a.delayBeforeStart / 1E3 + `s ` + a.css3easing), t = { transform: `translateY(` +
(a.direction == `up` ? `-` + q + `px` : k + `px`) + `)` }, e++) : e === 3 && (a.duration = a._completeDuration, d && (g += `0`, r = f.trim(r) + `0 `, d = g + ` ` + a.duration / 1E3 + `s 0s infinite ` + a.css3easing), C()) : (C(), t = { transform: `translateY(` + (a.direction == `up` ? `-` + c.height() + `px` : k + `px`) + `)` }) : a.duplicated ? (e > 2 && c.css(`transform`, `translateX(` + (a.direction == `left` ? 0 : `-` + m + `px`) + `)`), t = { transform: `translateX(` + (a.direction == `left` ? `-` + m + `px` : 0) + `)` }) : a.startVisible ? e === 2 ? (d && (d = g + ` ` + a.duration / 1E3 + `s ` + a.delayBeforeStart / 1E3 + `s ` + a.css3easing),
          t = { transform: `translateX(` + (a.direction == `left` ? `-` + m + `px` : n + `px`) + `)` }, e++) : e === 3 && (a.duration = a._completeDuration, d && (g += `0`, r = f.trim(r) + `0 `, d = g + ` ` + a.duration / 1E3 + `s 0s infinite ` + a.css3easing), D()) : (D(), t = { transform: `translateX(` + (a.direction == `left` ? `-` + m + `px` : n + `px`) + `)` }); b.trigger(`beforeStarting`); if (p) {
            c.css(B, d); var h = r + ` { 100%  ` + F(t) + `}`; var l = c.find(`style`); l.length !== 0 ? l.filter(`:last`).html(h) : f(`head`).append(`<style>` + h + `</style>`); E(c[0], `AnimationIteration`, () => { b.trigger(`finished`) })
            E(c[0], `AnimationEnd`, () => { w(); b.trigger(`finished`) })
          } else { c.animate(t, a.duration, a.easing, () => { b.trigger(`finished`); a.pauseOnCycle ? b.timer = setTimeout(w, a.delayBeforeStart) : w() }) }b.data(`runningStatus`, `resumed`)
        }; b.bind(`pause`, l.pause); b.bind(`resume`, l.resume); a.pauseOnHover && (b.bind(`mouseenter`, l.pause), b.bind(`mouseleave`, l.resume)); p && a.allowCss3Support ? w() : b.timer = setTimeout(w, a.delayBeforeStart)
      }
    })
  }; f.fn.marquee.defaults = { allowCss3Support: !0,
    css3easing: `linear`,
    easing: `linear`,
    delayBeforeStart: 1E3,
    direction: `left`,
    duplicated: !1,
    duration: 5E3,
    gap: 20,
    pauseOnCycle: !1,
    pauseOnHover: !1,
    startVisible: !1 }
})(jQuery)
