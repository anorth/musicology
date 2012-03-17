'use strict';
var musicology = angular.module("musicology", []);

// Tone generator service generates notes
musicology.factory('generator', ['audioContext', function(audioContext) {
  var svc = {
    "bufferSize": 4096,
    "playing": false,
    "frequency": 440,
    "functionName": "sine"
  };

  var functions = {
    "sine": function(f, t) { return Math.sin(2*Math.PI*f*t)},
    "square": function(f, t) { return (Math.sin(2*Math.PI*f*t)>0) ? 1 : -1 },
    "triangle": function(f, t) { return 2*(Math.abs(f*t%1-0.5)-0.25) }
  };

  // Calculate window, a Hanning Window
  // TODO: consider a Kaiser-Bessel window
  var windowCoeff = new Array(svc.bufferSize)
  var mid = Math.floor(svc.bufferSize / 2);
  windowCoeff[0] = 0;
  windowCoeff[mid] = 1;
  for (var i = 0; i < mid; ++i) {
    windowCoeff[mid + i] = (1.0 + Math.cos(Math.PI * i / mid)) / 2;
    windowCoeff[mid - i] = windowCoeff[mid + i]
  }

  var sourceId = audioContext.createSource(svc.bufferSize);

  svc.samples = audioContext.getSourceBuffer(sourceId);

  svc.setFunction = function(functionName) {
    svc.functionName = functionName;
    var fn = functions[functionName]
    for (var x = 0; x < svc.samples.length; ++x) {
      var t = x / audioContext.getSampleRate();
      svc.samples[x] = fn(svc.frequency, t) * windowCoeff[x];
    }
  };

  svc.noteOn = function() { audioContext.playSource(sourceId); };
  svc.noteOff = function() { audioContext.stopSource(sourceId); };

  return svc;
}]);

// "Hardware" service wraps the Web Audio functionality
musicology.factory('audioContext', function() {
  var audioContext = new webkitAudioContext();
  var sampleRate = audioContext.sampleRate;
  var sources = [];
  
  var mixerNode = audioContext.createChannelMerger();
  var analyserNode = audioContext.createAnalyser();
  var spectrum = new Float32Array(analyserNode.frequencyBinCount);

  // Wire up the analyser after the merger
  mixerNode.connect(analyserNode, 0, 0);
  analyserNode.connect(audioContext.destination, 0, 0);

  var svc = {
    "floor": -60,

    "getFftSize": function() { return analyserNode.fftSize; },

    "getFrequencyBinCount": function() { return analyserNode.frequencyBinCount; },

    "getSampleRate": function() { return audioContext.sampleRate; },

    // Creates a new buffer source, returns the source id.
    "createSource": function(bufferSize) {
      var sourceNode = audioContext.createBufferSource();
      sourceNode.loop = true;
      sourceNode.buffer = audioContext.createBuffer(1, bufferSize, svc.sampleRate);
      sourceNode.connect(mixerNode, 0, sources.length);
      sources.push(sourceNode);
      return sources.length - 1;
    },

    // Returns mutable buffer of samples for a source.
    "getSourceBuffer": function(sourceId) {
      return sources[sourceId].buffer.getChannelData(0);
    },

    "playSource": function(sourceId) {
      return sources[sourceId].noteOn(0);
    },

    "stopSource": function(sourceId) {
      return sources[sourceId].noteOff(0);
    },

    "getSpectrum": function() {
      analyserNode.getFloatFrequencyData(spectrum);
      return spectrum;
    }
  };
  return svc;
});
