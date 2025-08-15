var TFunc = {
    setCookie: function (name, value, expires, path, domain, secure) {
      var today = new Date();
      today.setTime(today.getTime());
      var expires_date = new Date(today.getTime() + expires);
      
      document.cookie = name + "=" + encodeURIComponent(value) +
        ((expires) ? ";expires=" + expires_date.toUTCString() : "") +
        ((path) ? ";path=" + path : "") +
        ((domain) ? ";domain=" + domain : "") +
        ((secure) ? ";secure" : "");
    },
    getCookie: function (name) {
      var start = document.cookie.indexOf(name + "=");
      var len = start + name.length + 1;
      
      if ((!start) && (name !== document.cookie.substring(0, name.length))) {
        return null;
      }
      if (start === -1) return null;
      
      var end = document.cookie.indexOf(";", len);
      if (end === -1) end = document.cookie.length;

      return decodeURIComponent(document.cookie.substring(len, end));
    },
    deleteCookie: function (name, path, domain) {
      if (this.getCookie(name)) {
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC" +
          ((path) ? ";path=" + path : "") +
          ((domain) ? ";domain=" + domain : "");
      }
    },
    addEvent: function (obj, eventName, func) {
      if (obj.attachEvent) {
        obj.attachEvent("on" + eventName, func);
      }
      else if (obj.addEventListener) {
        obj.addEventListener(eventName, func, true);
      }
      else {
        obj["on" + eventName] = func;
      }
    }
};