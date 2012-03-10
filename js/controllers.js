function AnalyserCtrl() {
  this.bufferSize = 4096;
  this.audioContext = new webkitAudioContext();
  this.sampleRate = this.audioContext.sampleRate;
  this.fn = "0";
  this.playing = false;
  
  this.sourceNode = this.audioContext.createBufferSource();
  this.sourceNode.loop = true;
  this.sourceNode.buffer = this.audioContext.createBuffer(1, this.bufferSize, this.sampleRate);
  var bufferData = this.sourceNode.buffer.getChannelData(0);
  for (var x = 0; x < bufferData.length; ++x) {
    bufferData[x] = eval(this.fn);
  }
  this.samples = bufferData;
  
  //this.generatorNode = this.audioContext.createJavaScriptNode(this.bufferSize, 0, 1);

  this.sourceNode.connect(this.audioContext.destination, 0, 0);
}


AnalyserCtrl.prototype = {
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
