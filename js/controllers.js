'use strict';
/* Generator */
function GeneratorCtrl($scope, generatorFactory) {
  this.$scope = $scope;

  $scope.init = function(generatorId) {
    console.log('Initialising generator controller ' + generatorId);
    $scope.generator = generatorFactory.makeGenerator();
    $scope.generatorId = generatorId;
    $scope.generator.setWaveformCanvasId("waveformCanvas" + generatorId);
    $scope.updateFunction();
  }

  $scope.updateFunction = function() {
    $scope.generator.updateFunction();
  };

  $scope.play = function() {
    if (!$scope.generator.playing) {
      console.log("play");
      $scope.generator.playing = true;
      $scope.generator.noteOn();
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
  };
}

GeneratorCtrl.$inject = ['$scope', 'generatorFactory'];

/* Analyzer */
function AnalyserCtrl($scope, audioContext) {
  this.$scope = $scope;
  $scope.audioContext = audioContext;
  $scope.smoothing = 0.9;
  $scope.analyserFloor = -50;
  $scope.showAnalysis = true;

  $scope.setSmoothing = function() {
    $scope.audioContext.setSmoothingTimeConstant($scope.smoothing);
  }

  // TODO: this should not be in a controller
  $scope.drawSpectrum = function() {
    if ($scope.showAnalysis) {
      var spectrum = $scope.audioContext.getSpectrum();
      var canvas = document.getElementById("spectrumCanvas");
      var ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw scale
      var tenDbHeight = canvas.height / (-$scope.analyserFloor) * 10;
      for (var y = tenDbHeight; y < canvas.height; y += tenDbHeight) {
        ctx.fillRect(0, y, canvas.width, 1);
      }


      // Switch canvas to cartesian co-ords
      ctx.save();
      ctx.translate(0,canvas.height); 
      ctx.scale(1,-1);
      
      for (var x = 0; x < canvas.width; ++x) {
        var amplitude = Math.max(-($scope.analyserFloor - spectrum[x]), 0);
        var height = amplitude / (-$scope.analyserFloor) * canvas.height
        //console.log("amp: " + amplitude + ", h: " + height);
        ctx.fillRect(x, 0, 1, height);
      }
      ctx.restore();
    }
    window.setTimeout($scope.drawSpectrum, 1000 / 20);
  };
}

AnalyserCtrl.$inject = ['$scope', 'audioContext'];
