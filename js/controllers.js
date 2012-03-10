function AnalyserCtrl() {
  this.bufferSize = 4096;
  this.audioContext = new webkitAudioContext();
  this.sampleRate = this.audioContext.sampleRate;
  this.fn = "(440*t%2<1)?440*t%1-0.5:0.5-(440*t%1)";
  this.playing = false;
  
  this.sourceNode = this.audioContext.createBufferSource();
  this.sourceNode.loop = true;
  this.sourceNode.buffer = this.audioContext.createBuffer(1, this.bufferSize, this.sampleRate);
  this.sourceNode.connect(this.audioContext.destination, 0, 0);
  this.samples = this.sourceNode.buffer.getChannelData(0);
  
  //this.generatorNode = this.audioContext.createJavaScriptNode(this.bufferSize, 0, 1);
}


AnalyserCtrl.prototype = {
  onFunctionChanged: function() {
    for (var x = 0; x < this.samples.length; ++x) {
      var t = x / this.sampleRate;
      try {
        this.samples[x] = eval(this.fn);
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
   ctx.beginPath();
   ctx.moveTo(0, originY);
   for (var x = 0; x < canvas.width; ++x) {
     var sampleIdx = Math.round(x * samplesPerPixel);
     var y = originY - (this.samples[sampleIdx] * originY);
     ctx.lineTo(x, y);
   }
   ctx.stroke();
  },
  play: function() {
    if (!this.playing) {
      console.log("play");
      this.playing = true;
      this.sourceNode.noteOn(0);
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
