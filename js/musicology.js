// Music theory and physics.

var MCY = MCY || {};

MCY.semitone = 1.05946309435929;
MCY.referenceNote = 69;
MCY.referenceFreq = 440;
// Names for notes zero thru 11
MCY.noteNames = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];

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

MCY.noteForFreq = function(f) {
  return Math.round(MCY.referenceNote + 12 * (Math.log(f / MCY.referenceFreq)) / Math.LN2);
};

MCY.nameNote = function(n) {
  return MCY.noteNames[n % 12];
}
