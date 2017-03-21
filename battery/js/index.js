// List of test images.
var images = {
  'Starry Night': 'https://lh6.ggpht.com/HlgucZ0ylJAfZgusynnUwxNIgIp5htNhShF559x3dRXiuy_UdP3UQVLYW6c',
  'T-Rex': 'https://lh4.ggpht.com/qCW18EYlcmqi-NIHuJ5VtwR1Cf8UlNzP-D0aqkPKG2nLzug3j8WnUtD2bwJ7',
  'The Kiss': 'https://lh4.ggpht.com/UuYCUnqvo2EIZhyFHYFVLbkmma_cubVk7SwxOF3lklT6aor5647BXVhEaFB7jg',
  'Nemo': 'https://lh3.googleusercontent.com/hDdgaQfhLXH7R8yaaHqcpvja5halx6LFzSc8NU50AqzjWyDZvNuZyOu7_HQBxpgJCw'
};

// Experiment configuration params.
var params = {};
params.debug = true;
params.webp = true;
params.size = 400;
params.target = images['Starry Night'];
params.batterydrop = 5;

// Public vars.
var counter = 0;
var stats, timer, initialBatt;
var hud = {};
var lock = false;
var running = false;
var once = false;
var debugEl = document.getElementById('debug');
var containerEl = document.getElementById('container');

var avg = function(arr) {
  return arr.reduce(function(a, b) {
    return a + b;
  }) / arr.length;
};

var updateHud = function() {
  if (!params.debug) {
    debugEl.style.display = 'none';
    return;
  }
  hud['Image format'] = params.webp ? 'WebP' : 'JPEG';
  hud['Fetch count'] = counter;
  if (stats.batt.length) {
    hud['Images/batt.% (avg)'] = stats.batt[stats.batt.length - 1] + ' (' + Math.round(avg(stats.batt)) + ')';
  }
  if (stats.fetch.length) {
    hud['Fetch time (avg)'] = stats.fetch[stats.fetch.length - 1] + ' ms (' + Math.round(avg(stats.fetch)) + ' ms)';
  }
  if (stats.read.length) {
    hud['Decode time (avg)'] = stats.read[stats.read.length - 1] + ' ms (' + Math.round(avg(stats.read)) + ' ms)';
  }
  if (stats.dom.length) {
    hud['DOM time (avg)'] = stats.dom[stats.dom.length - 1] + ' ms (' + Math.round(avg(stats.dom)) + ' ms)';
  }

  debugEl.style.display = '';
  var data = '';
  Object.keys(hud).forEach(function(key, index) {
    data += '<tr><td>' + key + '</td><td>' + hud[key] + '</td></tr>';
  });
  debugEl.innerHTML = data;
}

var updateBattery = function(level) {
  if (running && !!initialBatt) {
    if (stats.batt.length > 0) {
      stats.batt.push(
      counter - stats.batt.reduce(function(a, b) {
        return a + b;
      }));
    } else {
      stats.batt.push(counter);
    }
    if ((initialBatt - level) >= params.batterydrop / 100) {
      stop();
    }
  }
  hud['Battery level'] = Math.floor(level * 100);
  updateHud();
}

params.reset = function() {
  stats = {
    fetch: [],
    read: [],
    dom: [],
    batt: []
  };
  counter = 0;
  hud = {
    'Battery level': hud['Battery level']
  };
  updateHud();
};


var storeTimings = function(timings) {
  stats.fetch.push(timings.ready - timings.start);
  stats.read.push(timings.readEnd - timings.ready);
  stats.dom.push(timings.domEnd - timings.readEnd);
}

var fetch = function(url) {
  if (lock) {
    return;
  }
  lock = true;
  timer = {};

  var reader = new FileReader();
  reader.onloadend = function() {
    timer.readEnd = Date.now();
    containerEl.src = reader.result;
  };

  var xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.responseType = 'blob';
  xhr.onload = function(e) {
    counter++;
    if (xhr.readyState == 4) {
      timer.ready = Date.now();
      var blob = xhr.response;
      reader.readAsDataURL(blob);
    }
  };
  timer.start = Date.now();
  xhr.send();
};

var fetchNext = function(opt_manual) {
  once = !!opt_manual;
  if (!running && !opt_manual) {
    alert('Test complete. Images loaded: ' + counter);
    return;
  }
  var options = '=s' + params.size + (params.webp ? '-rw' : '-rj');
  fetch(params.target + options + '?count=' + counter + '&batt=' + hud['Battery level'] + '&ts=' + Date.now());
};

var stop = function() {
  running = false;
  document.getElementById('start').innerText = 'Start';
}

var startStop = function() {
  if (running) {
    stop();
    return;
  }
  var start = function() {
    document.getElementById('start').innerText = 'Stop';
    running = true;
    params.reset();
    fetchNext();
  }
  initialBatt = null;
  if (navigator.getBattery) {
    navigator.getBattery().then(function(battery) {
      initialBatt = battery.level;
      if (battery.charging) {
        alert('Device is currently charging, the test will likely run until you stop it manually.');
        start();
      }
      start();
    });
  } else {
    alert('Device doesn\'t support battery API, you\'ll have to manually stop the test.');
    start();
  }
};

// Init stuff.
params.reset();
containerEl.onload = function() {
  timer.domEnd = Date.now();
  storeTimings(timer);
  lock = false;
  updateHud();
  !once && fetchNext();
  once = false;
};

// Monitor battery level changes.
if (navigator.getBattery) {
  navigator.getBattery().then(function(battery) {
    battery.onlevelchange = function() {
      updateBattery(battery.level);
    };
    updateBattery(battery.level);
  });
};

// Build the GUI.
document.addEventListener('PaperGUIReady', function() {
  var gui = new PaperGUI();
  gui.add(params, 'debug').name('Show debug').onChange(updateHud);
  gui.add(params, 'webp').name('Use WebP').onChange(updateHud);
  gui.add(params, 'size').min(100).max(1200).step(100).name('Image size').onChange(updateHud);
  gui.add(params, 'batterydrop').min(1).name('Stop test after battery drop (%)');
  gui.add(params, 'target', images).name('Target image');
  gui.add({test: function() {
    fetchNext(true); }}, 'test').name('Test image load');
  gui.add(params, 'reset').name('Reset stats');
});

var guiScript = document.createElement('script');
guiScript.src = 'https://google.github.io/paper-gui/dist/paperGUI.js';
document.body.appendChild(guiScript);
