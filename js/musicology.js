// Music theory and physics.

var MCY = MCY || {};

MCY.semitone = 1.05946309435929;
MCY.raiseNote = function(f, semis) {
  return f * Math.pow(this.semitone, semis);
};

MCY.criticalBandwidth = function(f) {
  // Glasberg and Moore
  return 24.7 * (0.00437 * f + 1);
};

MCY.intervalDissonance = function(f1, f2) {
  var mid = (f1 + f2) / 2;
  var delta = Math.abs(f1 - f2);
  var cb = this.criticalBandwidth(mid);
  var deltaOnCb = delta / cb;
  // Crude approximation of Plomp's curve
  if (deltaOnCb <= 0.25) {
    return deltaOnCb * 4;
  } else if (deltaOnCb < 1) {
    return 1 - ((deltaOnCb - 0.25) / 0.75);
  } else {
    return 0;
  }
};
