'use strict';
var musicology = angular.module("musicology", []);

// 1.05946309435929, 

// Tone generator factory service builds note generators
musicology.factory('generatorFactory', ['audioContext', function(audioContext) {
  // Tone generation function constants
  var functions = {
    "sine": function(f, t) { return Math.sin(2*Math.PI*f*t); },
    "square": function(f, t) { return (Math.sin(2*Math.PI*f*t)>0) ? 1 : -1; },
    "triangle": function(f, t) { return 2*(Math.abs(f*t%1-0.5)-0.25); },
    "phat": function(f, t) { 
      var m = 0.5;
      var r = 0;
      for (var i = 1; i <= 8; ++i) {
        r += m * functions.sine(i * f, t);
        m *= 0.6;
      }
      return r;
    }
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
        "functionName": "phat",
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
  var sources = [];
  
  //var mixerNode = audioContext.createChannelMerger();
  var analyserNode = audioContext.createAnalyser();
  //analyserNode.fftSize = 4096; // doesn't work :(
  var spectrum = new Float32Array(analyserNode.frequencyBinCount);

  // Wire up the analyser after the merger
  //mixerNode.connect(analyserNode, 0, 0);
  analyserNode.connect(audioContext.destination, 0, 0);

  var sampleRate = audioContext.sampleRate;
  var bucketWidth = sampleRate / analyserNode.fftSize;
  var halfBucketWidth = bucketWidth / 2;

  var peaks = [];
  var buckets = [];
  var notes = [];

  var svc = {
    showAnalysis: true,
    analysisCanvasId: null,
    analyserFloor: -50,

    // Visible analysis results
    dissonanceTotal: 0,
    dissonanceMean: 0,

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

    "getNotes": function() {
      return notes;
    },

    "analyse": function() {
      if (this.showAnalysis) {
        var i, j;
        ///// Perform analysis /////
        analyserNode.getFloatFrequencyData(spectrum);

        // Clean up buckets
        buckets.length = 0;
        for (i = 0; i < spectrum.length; ++i) {
          buckets.push({
            frequency: (i * bucketWidth) + halfBucketWidth, // bucket centre
            intensity:  Math.max(-(this.analyserFloor - spectrum[i]), 0)
          });
        }

        // Detect peaks
        peaks.length = 0;
        for (i = 1; i < buckets.length - 1; ++i) {
          if (buckets[i].intensity > buckets[i-1].intensity && 
              buckets[i].intensity > buckets[i+1].intensity) {
            peaks.push({
              bucket: i,
              frequency: buckets[i].frequency,
              intensity: buckets[i].intensity,
              criticalBandwidth: MCY.criticalBandwidth(buckets[i].frequency)
            });
          }
        }
        //console.log("detected " + peaks.length + " peaks: " + JSON.stringify(peaks));

        // Calculate dissonance
        // FIXME only consider adjacent pairs?
        // TODO: take into account power?
        this.dissonanceTotal = 0;
        for (i = 0; i < peaks.length; ++i) {
          for (j = i + 1; j < peaks.length; ++j) {
            this.dissonanceTotal += MCY.intervalDissonance(peaks[i].frequency, peaks[j].frequency);
          }
        }
        this.dissonanceMean = this.dissonanceTotal / (peaks.length * (peaks.length - 1) / 2);
        //console.log(this.dissonanceTotal + " " + this.dissonanceMean);

        // Detect notes
        notes.length = 0;
        var peak, candidateNote, foundNote, multiplier, partialNumber, error, noteIdx;
        if (notes.length == 0) {

          for (var peakIdx = 0; peakIdx < peaks.length; ++peakIdx) {
            peak = peaks[peakIdx];
            foundNote = false;
            //console.log("testing peak at " + peak.frequency.toFixed());
            // Find existing note(s) for this partial, if any
            for (noteIdx = 0; noteIdx < notes.length; ++noteIdx) {
              candidateNote = notes[noteIdx];
              partialNumber = undefined;
              // For each existing note, test the two multiples of the note's fundamental
              // that lie either side of the canidate peak.
              multiplier = peak.frequency / candidateNote.fundamental;
              error = Math.abs((peak.frequency / Math.floor(multiplier)) - candidateNote.fundamental);
              if (error < candidateNote.error) {
                partialNumber = Math.floor(multiplier);
              }
              error = Math.abs((peak.frequency / Math.ceil(multiplier)) - candidateNote.fundamental);
              if (error < candidateNote.error) {
                partialNumber = Math.ceil(multiplier);
              }

              if (angular.isNumber(partialNumber)) {
                foundNote = true;
                candidateNote.peaks.push(peak);
                // Improve estimate of note fundamental
                candidateNote.fundamental = peak.frequency / partialNumber;
                candidateNote.error = bucketWidth / partialNumber;
                // Don't break, this peak might overlap another note too
              }
            }
            
            // Add a new note
            if (!foundNote) {
              //console.log("adding new note at " + peak.frequency.toFixed());
              notes.push({
                note: undefined,
                name: undefined,
                fundamental: peak.frequency,
                error: bucketWidth,
                intensity: peak.intensity, // Just of the fundamental at the moment
                peaks: [peak]
              });
            }
          }
          for (noteIdx = 0; noteIdx < notes.length; ++noteIdx) {
            var note = notes[noteIdx];
            note.noteNumber = MCY.noteForFreq(note.fundamental);
            note.name = MCY.nameNote(note.noteNumber);
          }
          //console.log("notes: " + notes);
        }
       
        this.drawAnalysis();
      }
    },

    drawAnalysis: function() {
      var i;
      var canvas = document.getElementById(this.analysisCanvasId);
      var ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw scale
      ctx.fillStyle = "#EEE";
      var tenDbHeight = canvas.height / (-this.analyserFloor) * 10;
      for (var y = tenDbHeight; y < canvas.height; y += tenDbHeight) {
        ctx.fillRect(0, y, canvas.width, 1);
      }

      // Draw exclusion zones
      ctx.fillStyle = "#DDF";
      for (i = 0; i < peaks.length; ++i) {
        var exclusionWidth = peaks[i].criticalBandwidth / 2;
        ctx.fillRect(peaks[i].bucket - exclusionWidth / bucketWidth, 0,
            2 * exclusionWidth / bucketWidth, canvas.height);
      }

      // Draw peaks
      ctx.fillStyle = "#77F";
      for (i = 0; i < peaks.length; ++i) {
        ctx.fillRect(peaks[i].bucket, 0, 1, canvas.height);
        ctx.fillText(Math.round(peaks[i].frequency), peaks[i].bucket + 4, 12 * (i+1));
      }

      // Draw labels
      ctx.fillStyle = "#77F";
      for (i = 0; i < peaks.length; ++i) {
        ctx.fillText(Math.round(peaks[i].frequency), peaks[i].bucket + 4, 12 * (i+1));
      }
      
      // Switch canvas to cartesian co-ords
      ctx.save();
      ctx.translate(0,canvas.height); 
      ctx.scale(1,-1);
      
      // Draw spectrum
      ctx.fillStyle = "#000";
      for (i = 0; i < canvas.width; ++i) {
        var height = buckets[i].intensity / (-this.analyserFloor) * canvas.height
        ctx.fillRect(i, 0, 1, height);
      }
      ctx.restore();
    }
  };

  var analyseFn = function() { svc.analyse.call(svc); };
  return svc;
});
