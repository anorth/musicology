'use strict';
var musicology = angular.module("musicology", []);
musicology.factory('generator', function() {
  var svc = {
    "bufferSize": 4096,
    "floor": -60,
    "playing": false,
    "frequency": 440,
    "functionName": "sine"
  };

  var functions = {
    "sine": function(f, t) { return Math.sin(2*Math.PI*f*t)},
    "square": function(f, t) { return (Math.sin(2*Math.PI*f*t)>0) ? 1 : -1 },
    "triangle": function(f, t) { return 2*(Math.abs(f*t%1-0.5)-0.25) }
  };

  var audioContext = new webkitAudioContext();
  svc.sampleRate = audioContext.sampleRate;
  
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

  // Create source
  var sourceNode = audioContext.createBufferSource();
  sourceNode.loop = true;
  sourceNode.buffer = audioContext.createBuffer(1, svc.bufferSize, svc.sampleRate);

  // Create analyser
  var analyserNode = audioContext.createAnalyser();

  // Wire things up
  sourceNode.connect(analyserNode, 0, 0);
  analyserNode.connect(audioContext.destination, 0, 0);

  svc.sourceNode = sourceNode;
  svc.analyserNode = analyserNode;
  svc.samples = sourceNode.buffer.getChannelData(0);
  svc.spectrum = new Float32Array(analyserNode.frequencyBinCount);

  svc.setFunction = function(functionName) {
    svc.functionName = functionName;
    var fn = functions[functionName]
    for (var x = 0; x < svc.samples.length; ++x) {
      var t = x / svc.sampleRate;
      svc.samples[x] = fn(svc.frequency, t) * windowCoeff[x];
    }
  };

  svc.getFftSize = function() { return analyserNode.fftSize; };
  svc.getFrequencyBinCount = function() { return analyserNode.frequencyBinCount; };
  return svc;
});
