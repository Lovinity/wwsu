  
importScripts('./worker/mp3EncoderWorker.umd.js');
self.mp3EncoderWorker.initMp3MediaEncoder({ vmsgWasmUrl: 'https://unpkg.com/vmsg@0.3.6/vmsg.wasm' });