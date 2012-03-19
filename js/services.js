'use strict';
var musicology = angular.module("musicology", []);

musicology.value('12thRoot2', 1.05946309435929);

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
      var waveformCanvasId;

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
          this.drawWaveform();
        },

        "noteOn": function() { audioContext.playSource(sourceId); },

        "noteOff": function() { 
          audioContext.stopSource(sourceId);
          // Re-create the source so it can be played again.
          audioContext.createSource(bufferSize, sourceId);
          this.samples = audioContext.getSourceBuffer(sourceId);
          this.updateFunction(this.functionName);
        },

        "setWaveformCanvasId": function(elt) {
          waveformCanvasId = elt;
        },

        "drawWaveform": function() {
          var canvas = document.getElementById(waveformCanvasId);
          if (!canvas) {
            console.log('No canvas ' + waveformCanvasId + ' yet');
            return;
          }
          var ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Draw zero line
          var originY = canvas.height / 2;
          var samplesPerPixel = this.samples.length / canvas.width;
          ctx.fillRect(0, originY, canvas.width, 1);
          // Draw waveform
          ctx.beginPath();
          ctx.moveTo(0, originY);
          for (var x = 0; x < canvas.width; ++x) {
            var sampleIdx = Math.round(x * samplesPerPixel);
            var y = originY - (this.samples[sampleIdx] * originY);
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        },
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
    showAnalysis: true,
    analysisCanvasId: null,
    analyserFloor: -50,

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

    "setAnalysisCanvasId": function(id) {
      this.analysisCanvasId = id;
    },

    "getSpectrum": function() {
      analyserNode.getFloatFrequencyData(spectrum);
      return spectrum;
    },

    "analyse": function() {
      if (this.showAnalysis) {
        analyserNode.getFloatFrequencyData(spectrum);
        var canvas = document.getElementById(this.analysisCanvasId);
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw scale
        var tenDbHeight = canvas.height / (-this.analyserFloor) * 10;
        for (var y = tenDbHeight; y < canvas.height; y += tenDbHeight) {
          ctx.fillRect(0, y, canvas.width, 1);
        }

        // Switch canvas to cartesian co-ords
        ctx.save();
        ctx.translate(0,canvas.height); 
        ctx.scale(1,-1);
        
        for (var x = 0; x < canvas.width; ++x) {
          var amplitude = Math.max(-(this.analyserFloor - spectrum[x]), 0);
          var height = amplitude / (-this.analyserFloor) * canvas.height
          //console.log("amp: " + amplitude + ", h: " + height);
          ctx.fillRect(x, 0, 1, height);
        }
        ctx.restore();
      }
      window.setTimeout(angular.bind(this, this.analyse), 1000 / 20);
    }
  };
  return svc;
});
