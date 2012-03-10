function GeneratorCtrl() {
}

function AnalyserCtrl() {
  this.bufferSize = 4096;
  this.floor = -60;
  this.audioContext = new webkitAudioContext();
  this.sampleRate = this.audioContext.sampleRate;
  this.fn = "(440*t%2<1)?440*t%1-0.5:0.5-(440*t%1)";
  this.playing = false;
  
  // Calculate window, a Hanning Window
  // TODO: consider a Kaiser-Bessel window
  this.windowCoeff = new Array(this.bufferSize)
  var mid = Math.floor(this.bufferSize / 2);
  this.windowCoeff[0] = 0;
  this.windowCoeff[mid] = 2;
  for (var i = 0; i < mid; ++i) {
    this.windowCoeff[mid + i] = 1 + Math.cos(Math.PI * i / mid);
    this.windowCoeff[mid - i] = this.windowCoeff[mid + i]
  }

  // Create source
  this.sourceNode = this.audioContext.createBufferSource();
  this.sourceNode.loop = true;
  this.sourceNode.buffer = this.audioContext.createBuffer(1, this.bufferSize, this.sampleRate);

  // Create analyser
  this.analyserNode = this.audioContext.createAnalyser();

  this.samples = this.sourceNode.buffer.getChannelData(0);
  this.spectrum = new Float32Array(this.analyserNode.frequencyBinCount);
  
  // Wire things up
  this.sourceNode.connect(this.analyserNode, 0, 0);
  this.analyserNode.connect(this.audioContext.destination, 0, 0);
}


AnalyserCtrl.prototype = {
  onFunctionChanged: function() {
    for (var x = 0; x < this.samples.length; ++x) {
      var t = x / this.sampleRate;
      try {
        this.samples[x] = eval(this.fn) * this.windowCoeff[x];
      } catch (e) {
        this.samples[x] = 0;
      }
    }
    this.drawWaveform();
  },

  drawWaveform: function() {
   var canvas = document.getElementById("waveformCanvas");
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

  drawSpectrum: function() {
    if (this.playing) {
      this.analyserNode.getFloatFrequencyData(this.spectrum);
      var canvas = document.getElementById("spectrumCanvas");
      var ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Switch canvas to cartesian co-ords
      ctx.save();
      ctx.translate(0,canvas.height); 
      ctx.scale(1,-1);

      for (var x = 0; x < canvas.width; ++x) {
        var amplitude = Math.max(-(this.floor - this.spectrum[x]), 0);
        var height = amplitude / (-this.floor) * canvas.height
        //console.log("amp: " + amplitude + ", h: " + height);
        ctx.fillRect(x, 0, 1, height);
      }
      ctx.restore();
    
      window.setTimeout(this.drawSpectrum, 1000 / 30);
    }
  },

  play: function() {
    if (!this.playing) {
      console.log("play");
      this.playing = true;
      this.sourceNode.noteOn(0);
      this.drawSpectrum();
    }
  },

  stop: function() {
    if (this.playing) {
      console.log("stop");
      this.playing = false;
      this.sourceNode.noteOff(0);
    }
  }
};
