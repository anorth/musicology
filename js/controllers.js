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

  // Bind MCY functions into scope
  angular.forEach(MCY, function(v, k) { $scope[k] = angular.bind(MCY, v); });
}

GeneratorCtrl.$inject = ['$scope', 'generatorFactory'];

/* Analyzer */
function AnalyserCtrl($scope, $window, audioContext) {
  this.$scope = $scope;
  $scope.audioContext = audioContext;
  $scope.smoothing = 0.9;
  $scope.sampleRate = audioContext.getSampleRate();
  $scope.fftSize = audioContext.getFftSize();
  $scope.frequencyBinCount = audioContext.getFrequencyBinCount();

  $scope.dissonanceTotal = 0;
  $scope.dissonanceMean = 0;

  audioContext.setAnalysisCanvasId("spectrumCanvas");

  $scope.setSmoothing = function() {
    $scope.audioContext.setSmoothingTimeConstant($scope.smoothing);
  };

  $scope.doAnalysis = function(firstTime) {
    audioContext.analyse();
    $scope.dissonanceTotal = audioContext.dissonanceTotal.toFixed(2);
    $scope.dissonanceMean = audioContext.dissonanceMean.toFixed(3);
    $scope.notes = audioContext.getNotes();
    if (!firstTime) { $scope.$apply(); }
    $window.setTimeout($scope.doAnalysis, 1000 / 15);
  };
}

AnalyserCtrl.$inject = ['$scope', '$window', 'audioContext'];
