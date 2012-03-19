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

  audioContext.setAnalysisCanvasId("spectrumCanvas");

  $scope.setSmoothing = function() {
    $scope.audioContext.setSmoothingTimeConstant($scope.smoothing);
  };
}

AnalyserCtrl.$inject = ['$scope', 'audioContext'];
