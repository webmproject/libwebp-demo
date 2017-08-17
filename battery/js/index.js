// List of preset test images. CORS must be enabled for these resources.
const images = {
  'Example 1 - WebP (600×800px)': 'https://www.gstatic.com/webp/measurement/example1.webp',
  'Example 1 - JPEG (600×800px)': 'https://www.gstatic.com/webp/measurement/example1.jpg',
  'Example 2 - WebP (800x533px)': 'https://www.gstatic.com/webp/measurement/example2.webp',
  'Example 2 - JPEG (800×533px)': 'https://www.gstatic.com/webp/measurement/example2.jpg',
  'Example 3 - WebP (1200×800px)': 'https://www.gstatic.com/webp/measurement/example3.webp',
  'Example 3 - JPEG (1200×800px)': 'https://www.gstatic.com/webp/measurement/example3.jpg',
};

// Experiment configuration parameters.
const params = {
  showInfo: true,
  presetUrl: images['Example 1 - WebP (600×800px)'],
  customUrl: '',
  batteryDrop: 5
};

// Public variables.
var counter = 0;
var running = false;
var timings, fetchPromise, once;
var stats = {};
var infoEl = document.getElementById('info');
var imageEl = document.getElementById('image');

// Clears the stats object and fetch counter.
function resetStats() {
  stats = {};
  counter = 0;
  imageEl.src = '';
  updateInfo();
};

// Renders the stats object as an HTML table.
function updateInfo() {
  if (!params.showInfo) {
    infoEl.style.display = 'none';
    return;
  }
  var tableData = {};

  if (stats.currentBatt && stats.initialBatt) {
    tableData['Battery level (at start)'] = Math.floor(stats.currentBatt * 100)
        + '% (' + Math.floor(stats.initialBatt * 100) + '%)';
  }
  if (stats.fileSize && stats.mime) {
    tableData['File info'] = stats.mime +  ', '
        + Math.round(stats.fileSize / 1000) + ' Kb';
  }
  tableData['Fetch count'] = counter;
  if (stats.batt && stats.batt.length) {
    tableData['Images/batt.% (avg)'] = stats.batt[stats.batt.length - 1] + ' ('
        + Math.round(average(stats.batt)) + ')';
  }
  if (stats.fetch && stats.fetch.length) {
    tableData['Fetch time (avg)'] = stats.fetch[stats.fetch.length - 1]
        + ' ms (' + Math.round(average(stats.fetch)) + ' ms)';
  }
  if (stats.load && stats.load.length) {
    tableData['Load time (avg)'] = stats.load[stats.load.length - 1] + ' ms ('
        + Math.round(average(stats.load)) + ' ms)';
  }

  var html = '';
  Object.keys(tableData).forEach(function(key) {
    html += '<tr><td>' + key + '</td><td>' + tableData[key] + '</td></tr>';
  });
  window.requestAnimationFrame(function() {
    infoEl.innerHTML = html;
    infoEl.style.display = '';
  });
}

// Downloads an image by URL via fetch API, storing some stats in the process,
// and renders it to the DOM via createObjectURL.
var doFetch = function(url) {
  if (fetchPromise) {
    return;
  }
  timings = {
    fetchStart: Date.now()
  };
  fetchPromise = fetch(url)
    .then(function(response) {
      timings.fetchEnd = Date.now();
      return response.blob();
    }, function(e) {
      alert('Unable to fetch the image. Either the URL is incorrect'
          + ' or the file has no Access-Control-Allow-Origin header.');
      stop();
      fetchPromise = null;
    })
    .then(function(imageBlob) {
      fetchPromise = null;
      if (!imageBlob || imageBlob.type.indexOf('image/') < 0) {
        alert('Woops, fetched file is not an image!');
        stop();
        return;
      }
      stats.mime = imageBlob.type.replace('image/', '');
      stats.fileSize = imageBlob.size;
      URL.revokeObjectURL(imageEl.src);
      var objectURL = URL.createObjectURL(imageBlob);
      timings.loadStart = Date.now();
      imageEl.src = objectURL;
      counter++;
    });

};

// Fetches the next image or shows test results if the loop was interrupted.
var fetchNext = function(opt_manual) {
  once = !!opt_manual;
  if (!running && !opt_manual) {
    alert('Test complete!\n\nImages loaded: ' + counter
        + (stats.batt && stats.batt.length ? '\nImages/batt.%: '
        + Math.round(average(stats.batt)) : '\nNo battery stats.'));
    return;
  }
  var url = params.customUrl || params.presetUrl;
  doFetch(url + '?ts=' + Date.now());
};

// Image element load callback. Tracks timings and triggers the next fetch.
imageEl.onload = function() {
  var loadEnd = Date.now();
  if (!stats.fetch) {
    stats.fetch = [];
    stats.load = [];
  }
  stats.fetch.push(timings.fetchEnd - timings.fetchStart);
  stats.load.push(loadEnd - timings.loadStart);
  updateInfo();
  !once && fetchNext();
  once = false;
};

// Interrupts the fetch loop.
function stop() {
  running = false;
  document.getElementById('btn').innerText = 'Start';
}

// Callback for the start/stop button. Runs or interrupts the fetch loop.
function startStop() {
  if (running) {
    stop();
    return;
  }
  var start = function() {
    document.getElementById('btn').innerText = 'Stop';
    running = true;
    fetchNext();
  }
  if (navigator.getBattery) {
    navigator.getBattery().then(function(battery) {
      stats.initialBatt = stats.currentBatt = battery.level;
      if (battery.charging) {
        alert('Device is currently charging, the test will likely run until'
            + ' you stop it manually.');
      }
      start();
    });
  } else {
    alert('Device doesn\'t support battery API, you\'ll have to manually stop'
        + ' the test.');
    start();
  }
};

// Battery level change handler. Logs the fetched images count per dropped %.
function batteryChangeHandler(level) {
  if (running && !!stats.initialBatt) {
    if (!stats.batt) {
      stats.batt = [];
    }
    if (stats.batt.length > 0) {
      stats.batt.push(
        counter - stats.batt.reduce(function(a, b) {
          return a + b;
        }));
    } else if (stats.initialBatt - level < 0.02) {
      // First battery level log. We skip the first percent drop because
      // it was probably not entirely consumed by the test and would skew
      // the stats.
      stats.firstPercentDrop = counter;
    } else {
      // First entry in the batt stats (count of images for the first full
      // percent drop).
      stats.batt.push(counter - stats.firstPercentDrop);
    }
    if ((stats.initialBatt - level) >= params.batteryDrop / 100) {
      stop();
    }
  }
  stats.currentBatt = level;
  updateInfo();
}

// Monitors battery level changes.
if (navigator.getBattery) {
  navigator.getBattery().then(function(battery) {
    battery.onlevelchange = function() {
      batteryChangeHandler(battery.level);
    };
  });
};

// Utility function.
function average(arr) {
  return arr.reduce((a, b) => a + b) / arr.length;
};

// Build the GUI.
document.addEventListener('PaperGUIReady', function() {
  var gui = new PaperGUI();
  gui.add(params, 'showInfo').name('Show stats (uses more battery)')
      .onChange(updateInfo);
  gui.add(params, 'batteryDrop').min(2)
      .name('Stop test after battery drop (%)');
  gui.add(params, 'presetUrl', images).name('Target image').onChange(stop);
  gui.add(params, 'customUrl').name('Custom image URL').onChange(stop);
  params.test = function() {
    !running && fetchNext(true);
  };
  gui.add(params, 'test').name('Test image load');
  params.reset = function() {
    resetStats();
  };
  gui.add(params, 'reset').name('Reset stats');

  // Bonus feature: export stats object to clipboard.
  if (document.queryCommandSupported('copy')) {
    params.copyStats = function() {
      window.getSelection().removeAllRanges();
      var textContainerEl = document.querySelector('.copyme');
      textContainerEl.value = JSON.stringify(stats);
      var range = document.createRange();
      range.selectNode(textContainerEl);
      window.getSelection().addRange(range);
      try {
        var successful = document.execCommand('copy');
        alert(successful ?
            'Stats have been copied to your clipboard as a JSON string.' :
            'Copy command failed!');
      } catch(e) {
        alert('Woops. Clouldn\'t copy the data to the clipboard!' + e);
      }
    };
    gui.add(params, 'copyStats').name('Export stats');
  }
});

var guiScript = document.createElement('script');
guiScript.src = 'https://google.github.io/paper-gui/dist/paperGUI.js';
document.body.appendChild(guiScript);
