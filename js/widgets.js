'use strict';
var widgets = angular.module("musicology.widgets", []);

widgets.directive('levelBar', function factory() {
  var ddo = {
    //priority: 0,
    template: '<div class="levelBar" style="width: {{1 + 10.0 * level}};">{{level}}</div>',
    //templateUrl: 'directive.html',
    replace: true,
    transclude: true,
    restrict: 'E',
    scope: { level: 'bind' },
    /*
    compile: function compile(tElement, tAttrs, transclude) {
      return {
        pre: function preLink(scope, iElement, iAttrs, controller) { ... },
        post: function postLink(scope, iElement, iAttrs, controller) { ... }
      }
    },
    */
    link: function postLink(scope, element, attrs) { 
      scope.$watch('level', function (newValue) {
        var width = Math.round(1 + 10.0 * newValue);
        console.log("element " + element);
        console.log("xxx " + element.prop('style').width);
        console.log("predefined width " + element.attr('style'));
        console.log("current width " + element.width);
        console.log("current width " + element.css('width'));
        console.log("setting width " + width);
        element.css('width', width);
        console.log("new width " + element.css('width'));
        console.log("xxx " + element.prop('style').width);
      });
    }
  };
  return ddo;
});

