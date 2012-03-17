'use strict';
/* Generator */
function GeneratorCtrl($scope, generator) {
  this.$scope = $scope;
  $scope.generator = generator;
  $scope.functionName = "sine";

  $scope.init = function(generatorId) {
    console.log('init ' + generatorId);
    $scope.generatorId = generatorId;
    $scope.setFunction();
  }

  $scope.setFunction = function() {
    $scope.generator.setFunction($scope.functionName);
    $scope.drawWaveform();
  };

  $scope.setFrequency = function() {
    $scope.generator.frequency = $scope.frequency;
    $scope.setFunction();
  };

  $scope.play = function() {
    if (!$scope.generator.playing) {
      console.log("play");
      $scope.generator.playing = true;
      $scope.generator.noteOn();
      $scope.drawSpectrum();
    }
  };

  $scope.stop = function() {
    if ($scope.generator.playing) {
      console.log("stop");
      $scope.generator.playing = false;
      $scope.generator.noteOff();
    }
  };

  $scope.isPlaying = function() {
    return $scope.generator.playing;
  }
  
  // TODO: this should not be in a controller
  $scope.drawWaveform = function() {
    var canvasId = "waveformCanvas" + $scope.generatorId;
    var canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.log('No canvas ' + canvasId + ' yet');
      return;
    }
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw zero line
    var originY = canvas.height / 2;
    var samplesPerPixel = $scope.generator.samples.length / canvas.width;
    ctx.fillRect(0, originY, canvas.width, 1);
    // Draw waveform
    ctx.beginPath();
    ctx.moveTo(0, originY);
    for (var x = 0; x < canvas.width; ++x) {
      var sampleIdx = Math.round(x * samplesPerPixel);
      var y = originY - ($scope.generator.samples[sampleIdx] * originY);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
}

GeneratorCtrl.$inject = ['$scope', 'generator'];

/* Analyzer */
function AnalyserCtrl($scope, generator, audioContext) {
  this.$scope = $scope;
  $scope.generator = generator;
  $scope.audioContext = audioContext;
  $scope.smoothing = 0.9;

  $scope.setSmoothing = function() {
    $scope.generator.analyserNode.smoothingTimeConstant = $scope.smoothing;
  }

  // TODO: this should not be in a controller
  $scope.drawSpectrum = function() {
    if ($scope.generator.playing) {
      var spectrum = $scope.audioContext.getSpectrum();
      var canvas = document.getElementById("spectrumCanvas");
      var ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Switch canvas to cartesian co-ords
      ctx.save();
      ctx.translate(0,canvas.height); 
      ctx.scale(1,-1);

      for (var x = 0; x < canvas.width; ++x) {
        var amplitude = Math.max(-($scope.audioContext.floor - spectrum[x]), 0);
        var height = amplitude / (-$scope.audioContext.floor) * canvas.height
        //console.log("amp: " + amplitude + ", h: " + height);
        ctx.fillRect(x, 0, 1, height);
      }
      ctx.restore();
    
      window.setTimeout($scope.drawSpectrum, 1000 / 30);
    }
  };

}

AnalyserCtrl.$inject = ['$scope', 'generator', 'audioContext'];
