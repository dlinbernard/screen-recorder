var background = {
  "port": null,
  "message": {},
  "receive": function (id, callback) {
    if (id) {
      background.message[id] = callback;
    }
  },
  "connect": function (port) {
    chrome.runtime.onMessage.addListener(background.listener); 
    /*  */
    if (port) {
      background.port = port;
      background.port.onMessage.addListener(background.listener);
      background.port.onDisconnect.addListener(function () {
        background.port = null;
      });
    }
  },
  "send": function (id, data) {
    if (id) {
      if (background.port) {
        if (background.port.name !== "webapp") {
          chrome.runtime.sendMessage({
            "method": id,
            "data": data,
            "path": "interface-to-background"
          }, function () {
            return chrome.runtime.lastError;
          });
        }
      }
    }
  },
  "post": function (id, data) {
    if (id) {
      if (background.port) {
        background.port.postMessage({
          "method": id,
          "data": data,
          "port": background.port.name,
          "path": "interface-to-background"
        });
      }
    }
  },
  "listener": function (e) {
    if (e) {
      for (let id in background.message) {
        if (background.message[id]) {
          if ((typeof background.message[id]) === "function") {
            if (e.path === "background-to-interface") {
              if (e.method === id) {
                background.message[id](e.data);
              }
            }
          }
        }
      }
    }
  }
};

var config = {
  "element": {
    "status": null,
  },
  "notifications": {
    "create": function (message) {
      window.alert(message);
    }
  },
  "beforeunload": function (e) {
    if (config.options.inteface.streamwrite) {
      if (config.recorder.engine && config.recorder.engine.state === "recording") {
        e.returnValue = "If you reload the app while recording, you will lose the recorded video. Are you sure you want to proceed?";
      }
    }
  },
  "addon": {
    "homepage": function () {
      return chrome.runtime.getManifest().homepage_url;
    },
    "page": {
      "edit": "https://mybrowseraddon.com/page-edit.html",
      "draw": "https://mybrowseraddon.com/draw-on-page.html",
      "webapp": "https://webbrowsertools.com/screen-recorder/"
    }
  },
  "button": {
    "icon": function (e) {
      if (chrome) {
        if (chrome.action) {
          if (chrome.action.setIcon) {
            chrome.action.setIcon({
              "path": {
                "16": "../../data/icons/" + (e ? e + '/' : '') + "16.png",
                "32": "../../data/icons/" + (e ? e + '/' : '') + "32.png",
                "48": "../../data/icons/" + (e ? e + '/' : '') + "48.png",
                "64": "../../data/icons/" + (e ? e + '/' : '') + "64.png"
              }
            });
          }
        }
      }
    }
  },
  "convert": {
    "seconds": {
      "to": {
        "hhmmss": function (e) {
          let input = parseInt(e, 10);
          let hours   = Math.floor(input / 3600);
          let minutes = Math.floor((input - (hours * 3600)) / 60);
          let seconds = input - (hours * 3600) - (minutes * 60);
          /*  */
          if (hours < 10) hours = '0' + hours;
          if (minutes < 10) minutes = '0' + minutes;
          if (seconds < 10) seconds = '0' + seconds;
          /*  */
          return hours + ':' + minutes + ':' + seconds;
        }
      }
    }
  },
  "resize": {
    "timeout": null,
    "method": function () {
      if (config.port.name === "win") {
        if (config.resize.timeout) window.clearTimeout(config.resize.timeout);
        config.resize.timeout = window.setTimeout(async function () {
          let current = await chrome.windows.getCurrent();
          /*  */
          config.storage.write("interface.size", {
            "top": current.top,
            "left": current.left,
            "width": current.width,
            "height": current.height
          });
        }, 1000);
      }
    }
  },
  "port": {
    "name": '',
    "connect": function () {
      config.port.name = "webapp";
      const context = document.documentElement.getAttribute("context");
      /*  */
      if (chrome.runtime) {
        if (chrome.runtime.connect) {
          if (context !== config.port.name) {
            if (document.location.search === "?tab") config.port.name = "tab";
            if (document.location.search === "?win") config.port.name = "win";
            if (document.location.search === "?popup") config.port.name = "popup";
            /*  */
            background.connect(chrome.runtime.connect({"name": config.port.name}));
          }
        }
      }
      /*  */
      document.documentElement.setAttribute("context", config.port.name);
    }
  },
  "storage": {
    "local": {},
    "read": function (id) {
      return config.storage.local[id];
    },
    "load": function (callback) {
      chrome.storage.local.get(null, function (e) {
        config.storage.local = e;
        callback();
      });
    },
    "write": function (id, data) {
      if (id) {
        if (data !== '' && data !== null && data !== undefined) {
          let tmp = {};
          tmp[id] = data;
          config.storage.local[id] = data;
          chrome.storage.local.set(tmp, function () {});
        } else {
          delete config.storage.local[id];
          chrome.storage.local.remove(id, function () {});
        }
      }
    }
  },
  "downloads": {
    "start": function (options, callback) {
      if (chrome.downloads) {
        chrome.downloads.download(options, function (e) {
          if (callback) callback(e);
        });
      }
    },
    "search": function (options, callback) {
      if (chrome.downloads) {
        chrome.downloads.search(options, function (e) {
          if (callback) callback(e);
        });
      }
    },
    "on": {
      "changed": function (callback) {
        if (chrome.downloads) {
          chrome.downloads.onChanged.addListener(function (e) {
            callback(e);
          });
        }
      }
    }
  },
  "options": {
    "inteface": {
      set minimize (val) {config.storage.write("inteface-minimize", val)},
      set seekable (val) {config.storage.write("inteface-seekable", val)},
      set streamwrite (val) {config.storage.write("inteface-stream-write", val)},
      get minimize () {return config.storage.read("inteface-minimize") !== undefined ? config.storage.read("inteface-minimize") : true},
      get seekable () {return config.storage.read("inteface-seekable") !== undefined ? config.storage.read("inteface-seekable") : false},
      get streamwrite () {return config.storage.read("inteface-stream-write") !== undefined ? config.storage.read("inteface-stream-write") : true}
    },
    "quality": {
      set id (val) {config.storage.write("quality-id", val)},
      set name (val) {config.storage.write("quality-name", val)},
      get id () {return config.storage.read("quality-id") !== undefined ? config.storage.read("quality-id") : ''},
      get name () {return config.storage.read("quality-name") !== undefined ? config.storage.read("quality-name") : "default"}
    },
    "video": {
      "source": {
        set id (val) {config.storage.write("video-source-id", val)},
        set name (val) {config.storage.write("video-source-name", val)},
        get id () {return config.storage.read("video-source-id") !== undefined ? config.storage.read("video-source-id") : ''},
        get name () {return config.storage.read("video-source-name") !== undefined ? config.storage.read("video-source-name") : "screen"}
      }
    },
    "audio": {
      "mute": {
        "while": {
          set recording (val) {config.storage.write("audio-mute-while-recording", val)},
          get recording () {return config.storage.read("audio-mute-while-recording") !== undefined ? config.storage.read("audio-mute-while-recording") : false}
        }
      },
      "source": {
        set id (val) {config.storage.write("audio-source-id", val)},
        set name (val) {config.storage.write("audio-source-name", val)},
        get id () {return config.storage.read("audio-source-id") !== undefined ? config.storage.read("audio-source-id") : ''},
        get name () {return config.storage.read("audio-source-name") !== undefined ? config.storage.read("audio-source-name") : "system"}
      }
    }
  },
  "permissions": {
    "query": async function (options) {
      return await new Promise(function (resolve, reject) {
        const firefox = navigator.userAgent.toLowerCase().indexOf("firefox");
        if (firefox) {
          resolve({"state": "unsupported"});
        } else {
          try {
            if ("permissions" in navigator) {
              navigator.permissions.query(options).then(resolve).catch(function (e) {
                resolve({"state": undefined});
                config.notifications.create("Error! could not query required permissions!");
              });
            } else {
              resolve({"state": undefined});
              config.notifications.create("Error! 'permissions' is not available!");
            }
          } catch (e) {
            resolve({"state": undefined});
            config.notifications.create("Error! 'permissions' is not available!");
          }
        }
      });
    },
    "optional": {
      "contains": function (callback) {
        const context = document.documentElement.getAttribute("context");
        /*  */
        if (context !== "webapp") {
          chrome.permissions.contains({
            "permissions": ["downloads"]
          }, function (e) {
            if (callback) {
              callback(e);
            }
          });
        }
      },      
      "request": function (callback) {
        const context = document.documentElement.getAttribute("context");
        /*  */
        if (context !== "webapp") {
          chrome.permissions.request({
            "permissions": ["downloads"]
          }, function (e) {
            if (callback) {
              callback(e);
            }
          });
        }
      },
      "remove": function (callback) {
        const context = document.documentElement.getAttribute("context");
        /*  */
        if (context !== "webapp") {
          chrome.permissions.remove({
            "permissions": ["downloads"]
          }, function (e) {
            if (callback) {
              callback(e);
            }
          });
        }
      }
    }
  },
  "load": function () {
    const draw = document.getElementById("draw");
    const edit = document.getElementById("edit");
    const webapp = document.getElementById("webapp");
    const reload = document.getElementById("reload");
    const support = document.getElementById("support");
    const donation = document.getElementById("donation");
    const labels = [...document.querySelectorAll("label")];
    const options = [...document.querySelectorAll(".option")];
    /*  */
    config.element.elapsed = document.querySelector(".elapsed");
    config.element.status = document.querySelector(".status");
    config.element.start = document.querySelector(".start");
    config.element.logo = document.querySelector(".logo");
    config.element.logo.setAttribute("init", '');
    /*  */
    reload.addEventListener("click", function () {
      document.location.reload();
    });
    /*  */
    draw.addEventListener("click", function () {
      const url = config.addon.page.draw;
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    edit.addEventListener("click", function () {
      const url = config.addon.page.edit;
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    webapp.addEventListener("click", function () {
      const url = config.addon.page.webapp;
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    support.addEventListener("click", function () {
      const url = config.addon.homepage();
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    donation.addEventListener("click", function () {
      const url = config.addon.homepage() + "?reason=support";
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    options.forEach(function (option) {
      option.addEventListener("click", function (e) {
        const input = e.target.querySelector("input");
        if (input) input.click();
      });
    });
    /*  */
    config.element.start.addEventListener("click", function () {
      const recording = config.recorder.engine && config.recorder.engine.state !== "inactive";
      if (recording) {
        config.recorder.stop();
      } else {
        if (config.recorder.api.version) {
          config.recorder.context = new AudioContext();
          config.recorder.start[config.recorder.api.version]();
        } else {
          config.notifications.create("Error! screen recorder is not ready.");
          config.element.status.textContent = "Screen recorder is not ready!";
        }
      }
    });
    /*  */
    labels.forEach(function (label) {
      label.addEventListener("mouseenter", function (e) {
        config.element.status.textContent = e.target ? e.target.dataset.title : '';
      });
      /*  */
      label.addEventListener("mouseleave", function (e) {
        window.setTimeout(function () {
          config.element.status.textContent = '';
        }, 100);
      });
    });
    /*  */
    config.storage.load(config.app.start);
    window.removeEventListener("load", config.load, false);
  },
  "app": {
    "start": async function () {
      config.button.icon(null);
      if (config.options.inteface.streamwrite === false) config.recorder.fileio.old.restore();
      /*  */
      const permission = await config.permissions.query({"name": "microphone"});
      if (permission.state === "prompt") {
        if (config.options.audio.source.name === "mixed" || config.options.audio.source.name === "microphone") {
          config.options.audio.source.id = null;
          config.options.audio.source.name = "system";
        }
      }
      /*  */
      const mute = document.querySelector("input[id='mute']");
      const minimize = document.querySelector("input[id='minimize']");
      const seekable = document.querySelector("input[id='seekable']");
      const context = document.documentElement.getAttribute("context");
      const streamwrite = document.querySelector("input[id='streamwrite']");
      const quality = document.querySelector("input[id='" + config.options.quality.name + "']");
      const video = document.querySelector("input[id='" + config.options.video.source.name + "']");
      const audio = document.querySelector("input[id='" + config.options.audio.source.name + "']");
      /*  */
      if (video) video.checked = true;
      if (audio) audio.checked = true;
      if (quality) quality.checked = true;
      if (minimize) minimize.checked = config.options.inteface.minimize;
      if (seekable) seekable.checked = config.options.inteface.seekable;
      if (mute) mute.checked = config.options.audio.mute.while.recording;
      if (streamwrite) streamwrite.checked = config.options.inteface.streamwrite;
      if (streamwrite) streamwrite.disabled = window.showSaveFilePicker ? false : true;
      config.recorder.api.version = chrome && chrome.desktopCapture && chrome.desktopCapture.chooseDesktopMedia ? "old" : "new";
      /*  */
      minimize.addEventListener("change", function (e) {
        config.options.inteface.minimize = e.target.checked;
      });      
      /*  */
      seekable.addEventListener("change", function (e) {
        config.options.inteface.seekable = e.target.checked;
      });
      /*  */
      mute.addEventListener("change", function (e) {
        config.options.audio.mute.while.recording = e.target.checked;
      });
      /*  */
      config.permissions.optional.contains(function (result) {
        if (result === false) {
          if (streamwrite.checked === false) {
            streamwrite.click();
          }
        }
      });
      /*  */
      streamwrite.addEventListener("change", function (e) {
        if (e.target.checked) {
          config.permissions.optional.remove();
          config.options.inteface.streamwrite = e.target.checked;
        } else {
          config.permissions.optional.request(function (granted) {
            if (granted) {
              config.options.inteface.streamwrite = e.target.checked;
            } else {
              e.target.checked = true;
            }
          });
        }
      }); 
      /*  */
      window.setTimeout(function () {
        config.element.logo.removeAttribute("init");
        config.element.status.textContent = "Screen recorder is ready.";
      }, 1500);
      /*  */
      if (context === "webapp") {
        document.querySelector(".row[category='settings']").setAttribute("disabled", '');
      } else {
        document.querySelector(".row[category='settings']").removeAttribute("disabled");
      }
      /*  */
      if (config.recorder.api.version === "new") {
        document.querySelector(".row[category='video']").setAttribute("disabled", '');
        document.querySelector(".row[category='audio']").setAttribute("disabled", '');
        config.element.status.textContent = "API >> navigator -> mediaDevices -> getDisplayMedia";
      } else {
        document.querySelector(".row[category='video']").removeAttribute("disabled");
        document.querySelector(".row[category='audio']").removeAttribute("disabled");
        config.element.status.textContent = "API >> chrome -> desktopCapture -> chooseDesktopMedia";
      }
      /*  */
      config.downloads.on.changed(function (e) {
        if (config.options.inteface.streamwrite === false) {
          if (e) {
            if (e.id === config.recorder.fileio.old.disk.id) {
              config.downloads.search({"id": e.id}, function (arr) {
                if (arr && arr.length) {
                  if (arr[0].state) {
                    if (arr[0].state === "complete") {
                      const filename = arr[0].filename ? ' to: \n\n' + arr[0].filename : '.';
                      config.notifications.create("The recorded screen is downloaded" + filename);
                    }
                  }
                }
              });
            }
          }
        }
      });
      /*  */
      const inputs = [...document.querySelectorAll("input[type='radio']")];
      if (inputs && inputs.length) {
        for (let i = 0; i < inputs.length; i++) {
          inputs[i].addEventListener("change", function (e) {
            if (e) {
              if (e.target) {
                let name = e.target.name;
                let value = e.target.value;
                /*  */
                if (name) {
                  if (value) {
                    if (name === "quality") {
                      config.options.quality.name = value;
                    }
                    /*  */
                    if (name === "video-source") {
                      config.options.video.source.name = value;
                    }
                    /*  */
                    if (name === "audio-source") {
                      if (value === "mixed" || value === "microphone") {
                        navigator.mediaDevices.getUserMedia({"video": false, "audio": true}).then(function (stream) {                      
                          config.options.audio.source.name = value;
                          config.options.audio.source.id = stream.id;
                        });
                      } else {
                        config.options.audio.source.id = null;
                        config.options.audio.source.name = value;
                      }
                    }
                  }
                }
              }
            }
          });
        }
      }
    }
  }
};

background.receive("button", function () {
  let state = config.element.start.textContent;
  if (state === "STOP") {
    config.element.start.click();
  }
});

config.port.connect();
window.addEventListener("load", config.load, false);
window.addEventListener("resize", config.resize.method, false);
window.addEventListener("beforeunload", config.beforeunload, {"capture": true});