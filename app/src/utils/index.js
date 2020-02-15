import _ from 'lodash';

function setCookie(name,value,days) {
  var expires = "";
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + (days*24*60*60*1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for(var i=0;i < ca.length;i++) {
    var c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  }
  return null;
}

function eraseCookie(name) {
  document.cookie = name+'=; Max-Age=-99999999;';
}

function setLocalStorageItem(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function getLocalStorageItem(key) {
  const data = localStorage.getItem(key);
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

function getBase64FromFile(file, done) {
   const reader = new FileReader();
   reader.readAsDataURL(file);
   reader.onload = function () {
     done(null, reader.result)
   };
   reader.onerror = function (error) {
     done(error);
   };
}

function formatDuration(x) {
  if (_.isNil(x)) {
    return;
  }
  var sec_num = parseInt(x, 10); // don't forget the second param
  var hours   = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
  var seconds = sec_num - (hours * 3600) - (minutes * 60);

  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  if (minutes > 0) {
    return `${minutes} min`;
  }
  return `<1 min`;
}

function getAvatarColor(value) {
  if (_.isNil(value)) {
    return 'automatic';
  } else if (value <= 3) {
    return 'red';
  } else if (value <= 6) {
    return 'yellow';
  } else {
    return 'green';
  }
  return 'grey';
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getQueryVariable(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split('&');
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split('=');
    if (decodeURIComponent(pair[0]) == variable) {
      return decodeURIComponent(pair[1]);
    }
  }
}

module.exports = {
  setCookie,
  getCookie,
  eraseCookie,
  setLocalStorageItem,
  getLocalStorageItem,
  getBase64FromFile,
  formatDuration,
  getAvatarColor,
  hexToRgb,
  getQueryVariable,
}
