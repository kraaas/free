define([], function() {
  function addEvent(type, target, handler) {
    if(!target || !type || !handler) return;
    if (window.addEventListener) {
      addEvent = function() {
        target.addEventListener(type, handler, false);
      }
    } else if (window.attachEvent) {
      addEvent = function() {
        target.attachEvent('on' + type, handler);
      }
    } else {
      addEvent = function() {
        target['on' + type] = handler
      }
    }
    addEvent();
  }

  return { 
  	addEvent: addEvent 
  };
})
