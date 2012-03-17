'use strict';
var musicology = angular.module("musicology", []);

// Tone generator factory service builds note generators
musicology.factory('generatorFactory', ['audioContext', function(audioContext) {
  // Tone generation function constants
  var functions = {
    "sine": function(f, t) { return Math.sin(2*Math.PI*f*t)},
    "square": function(f, t) { return (Math.sin(2*Math.PI*f*t)>0) ? 1 : -1 },
    "triangle": function(f, t) { return 2*(Math.abs(f*t%1-0.5)-0.25) }
  };

  // Constant buffer size for all generators
  var bufferSize = 4096;
  //var bufferSize = 8192;

  // Buffer window to reduce aliasing: a Hanning Window
  // TODO: consider a Kaiser-Bessel window
  var windowCoeff = new Array(bufferSize)
  var mid = Math.floor(bufferSize / 2);
  windowCoeff[0] = 0;
  windowCoeff[mid] = 1;
  for (var i = 0; i < mid; ++i) {
    windowCoeff[mid + i] = (1.0 + Math.cos(Math.PI * i / mid)) / 2;
    windowCoeff[mid - i] = windowCoeff[mid + i]
  }

  return {
    // Builds a tone generator
    makeGenerator: function() {
      var sourceId = audioContext.createSource(bufferSize);
      var generator = {
        "sourceId": sourceId,
        "playing": false,
        "frequency": 440,
        "functionName": "sine",
        "samples": audioContext.getSourceBuffer(sourceId),

        "getBufferSize": function() { return bufferSize; },

        "getBufferDuration": function() { return bufferSize / audioContext.getSampleRate(); },

        "updateFunction": function() {
          console.log("Evaluating function " + this.functionName + " at " + this.frequency);
          var fn = functions[this.functionName];
          var samples = audioContext.getSourceBuffer(sourceId);
          for (var x = 0; x < samples.length; ++x) {
            var t = x / audioContext.getSampleRate();
            samples[x] = fn(this.frequency, t) * windowCoeff[x];
          }
        },

        "noteOn": function() { audioContext.playSource(sourceId); },

        "noteOff": function() { 
          audioContext.stopSource(sourceId);
          // Re-create the source so it can be played again.
          audioContext.createSource(bufferSize, sourceId);
          this.samples = audioContext.getSourceBuffer(sourceId);
          this.updateFunction(this.functionName);
        }
      };

      return generator;
    }
  };
}]);

// "Hardware" service wraps the Web Audio functionality
musicology.factory('audioContext', function() {
  var audioContext = new webkitAudioContext();
  var sampleRate = audioContext.sampleRate;
  var sources = [];
  
  //var mixerNode = audioContext.createChannelMerger();
  var analyserNode = audioContext.createAnalyser();
  var spectrum = new Float32Array(analyserNode.frequencyBinCount);

  // Wire up the analyser after the merger
  //mixerNode.connect(analyserNode, 0, 0);
  analyserNode.connect(audioContext.destination, 0, 0);

  var svc = {
    "floor": -60,

    "getFftSize": function() { return analyserNode.fftSize; },

    "getFrequencyBinCount": function() { return analyserNode.frequencyBinCount; },

    "getSampleRate": function() { return audioContext.sampleRate; },

    "getSmoothingTimeConstant": function() { return analyserNode.smoothingTimeConstant; },

    "setSmoothingTimeConstant": function(s) { analyserNode.smoothingTimeConstant = s; },

    // Creates a new buffer source, returns the source id.
    "createSource": function(bufferSize, sourceId) {
      sourceId = isFinite(sourceId) ? sourceId : sources.length;
      var sourceNode = audioContext.createBufferSource();
      sourceNode.loop = true;
      sourceNode.buffer = audioContext.createBuffer(1, bufferSize, svc.sampleRate);
      if (sources[sourceId]) { sources[sourceId].disconnect(0); }
      sourceNode.connect(analyserNode/*mixerNode*/, 0, 0);
      sources[sourceId] = sourceNode;
      return sourceId;
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
