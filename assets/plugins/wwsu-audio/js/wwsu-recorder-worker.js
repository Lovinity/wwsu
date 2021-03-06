'use strict';
importScripts('../../mp3-mediarecorder/worker/index.umd.js');
self.mp3EncoderWorker.initMp3MediaEncoder({ vmsgWasmUrl: '../../vmsg/vmsg.wasm' });