/* Generator */
function GeneratorCtrl(generator) {
  this.generator = generator;
  this.functionName = "sine";
}

GeneratorCtrl.$inject = ['generator'];

GeneratorCtrl.prototype = {
  setFunction: function() {
    this.generator.setFunction(this.functionName);
    this.drawWaveform();
  },

  setFrequency: function() {
    this.generator.frequency = this.frequency;
    this.setFunction();
  }
};

/* Analyzer */
function AnalyserCtrl(generator) {
  this.generator = generator;
}

AnalyserCtrl.$inject = ['generator'];

AnalyserCtrl.prototype = {
  drawWaveform: function() {
   var canvas = document.getElementById("waveformCanvas");
   var ctx = canvas.getContext('2d');
   ctx.clearRect(0, 0, canvas.width, canvas.height);
   // Draw zero line
   var originY = canvas.height / 2;
   var samplesPerPixel = this.generator.samples.length / canvas.width;
   ctx.fillRect(0, originY, canvas.width, 1);
   // Draw waveform
   ctx.beginPath();
   ctx.moveTo(0, originY);
   for (var x = 0; x < canvas.width; ++x) {
     var sampleIdx = Math.round(x * samplesPerPixel);
     var y = originY - (this.generator.samples[sampleIdx] * originY);
     ctx.lineTo(x, y);
   }
   ctx.stroke();
  },

  drawSpectrum: function() {
    if (this.generator.playing) {
      this.generator.analyserNode.getFloatFrequencyData(this.generator.spectrum);
      var canvas = document.getElementById("spectrumCanvas");
      var ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Switch canvas to cartesian co-ords
      ctx.save();
      ctx.translate(0,canvas.height); 
      ctx.scale(1,-1);

      for (var x = 0; x < canvas.width; ++x) {
        var amplitude = Math.max(-(this.generator.floor - this.generator.spectrum[x]), 0);
        var height = amplitude / (-this.generator.floor) * canvas.height
        //console.log("amp: " + amplitude + ", h: " + height);
        ctx.fillRect(x, 0, 1, height);
      }
      ctx.restore();
    
      window.setTimeout(this.drawSpectrum, 1000 / 30);
    }
  },

  play: function() {
    if (!this.generator.playing) {
      console.log("play");
      this.generator.playing = true;
      this.generator.sourceNode.noteOn(0);
      this.drawSpectrum();
    }
  },

  stop: function() {
    if (this.generator.playing) {
      console.log("stop");
      this.generator.playing = false;
      this.generator.sourceNode.noteOff(0);
    }
  }
};
