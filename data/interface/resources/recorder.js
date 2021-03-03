config.recorder = {
  "engine": null,
  "stream": null,
  "switch": true,
  "context": null,
  "timestep": 10000,
  "api": {"version": null},
  "interval": {
    "button": null,
    "status": null,
  },
  "audio": {
    "mandatory": {
      "chromeMediaSourceId": null,
      "chromeMediaSource": "system"
    }
  },
  "video": {
    "mandatory": {
      "chromeMediaSourceId": null,
      "chromeMediaSource": "desktop"
    }
  },
  "loop": function () {
    var recording = config.recorder.engine && config.recorder.engine.state !== "inactive";
    if (recording) config.recorder.engine.requestData();
    /*  */
    if (config.recorder.file.capture.id) window.clearTimeout(config.recorder.file.capture.id);
    config.recorder.file.capture.id = window.setTimeout(config.recorder.loop, config.recorder.timestep);
  },
  "stop": async function () {
    config.button.icon(null);
    config.recorder.switch = true;
    config.element.status.textContent = '';
    config.element.elapsed.textContent = '';
    config.element.start.textContent = "START";
    config.element.logo.removeAttribute("blink");
    /*  */
    if (config.options.inteface.minimize) background.send("state", "normal");
    if (config.recorder.interval.status) window.clearInterval(config.recorder.interval.status);
    if (config.recorder.interval.button) window.clearInterval(config.recorder.interval.button);
    /*  */
    var tracks = config.recorder.stream ? config.recorder.stream.getTracks() : [];
    var recording = config.recorder.engine && config.recorder.engine.state !== "inactive";
    /*  */
    for (var i = 0; i < tracks.length; i++) {
      tracks[i].stop();
    }
    /*  */
    if (recording) {
      config.recorder.engine.stop();
    }
    /*  */
    if (config.recorder.context) {
      await config.recorder.context.close();
      delete config.recorder.context;
    }
  },
  "load": function (constraints) {
    if (navigator) {
      if (navigator.mediaDevices) {
        if (navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia(constraints).then(function (desktop) {
            if (config.options.audio.source.name === "mixed" || config.options.audio.source.name === "microphone") {
              navigator.mediaDevices.getUserMedia({"video": false, "audio": true}).then(function (microphone) {
                config.recorder.finalize(microphone, desktop);
              }).catch(function (e) {
                config.notifications.create("Error! 'microphone' is not allowed!");
              });
            } else {
              config.recorder.finalize(null, desktop);
            }
          }).catch(function (e) {
            config.notifications.create("Recording canceled! please select an option and try again.");
          });
        } else {
          config.notifications.create("Error! 'getUserMedia' is not available on your machine!");
        }
      } else {
        config.notifications.create("Error! 'mediaDevices' is not available on your machine!");
      }
    } else {
      config.notifications.create("Error! 'navigator' is not available on your machine!");
    }
  },
  "blink": {
    "logo": function () {
      config.element.logo.setAttribute("blink", '');
    },
    "button": function () {
      if (config.recorder.interval.button) window.clearInterval(config.recorder.interval.button);
      config.recorder.interval.button = window.setInterval(function () {
        config.button.icon(config.recorder.switch ? "ON" : "OFF");
        config.recorder.switch = !config.recorder.switch;
      }, 500);
    },
    "status": function () {
      var a = "Recording";
      var b = "Recording.";
      var c = "Recording..";
      var d = "Recording...";
      /*  */
      if (config.recorder.interval.status) window.clearInterval(config.recorder.interval.status);
      config.recorder.interval.status = window.setInterval(function () {
        var e = config.element.status.textContent;
        var elapsed = Math.round(((new Date()) - config.recorder.start.time) / 1000);
        /*  */
        config.element.status.textContent = e === a ? b : (e === b ? c : (e === c ? d : a));
        config.element.elapsed.textContent = "Elapsed time: " + config.convert.seconds.to.hhmmss(elapsed);
      }, 500);
    }
  },
  "file": {
    "data": null,
    "disk": {"id": null},
    "tmp": {"buffer": null},
    "capture": {
      "id": 0,
      "offset": 0,
      "progress": 0
    },
    "name": function () {
      var date = (new Date()).toString().toLowerCase().slice(0, 24);
      var filename = "screen-recorder-" + date.replace(/ /g, '-').replace(/:/g, '-') + ".webm";
      return filename;
    },
    "download": function () {
      var inactive = config.recorder.engine && config.recorder.engine.state === "inactive";
      if (inactive && config.recorder.file.capture.progress === 0) {
        config.element.status.textContent = "Processing the video, please wait...";
        /*  */
        window.setTimeout(function () {
          if (config.recorder.file.capture.id) {
            window.clearTimeout(config.recorder.file.capture.id);
          }
          /*  */
          config.recorder.file.data.download({
            "offsets": [],
            "mime": "video/webm",
            "filename": config.recorder.file.name()
          }).then(function (e) {
            if (e.state === "complete") {
              window.setTimeout(function () {
                config.element.status.textContent = '';
                config.recorder.file.disk.id = e.id;
                config.recorder.file.data.remove();
                delete config.recorder.stream;
                delete config.recorder.engine;
              }, 300);
            } else {
              config.notifications.create("Error! could not write the result to disk!");
            }
          }).catch(function (e) {
            config.notifications.create("Error! could not write the result to disk!");
          });
        }, 300);
      }
    },
    "restore": async function () {
      var stack = null;
      if ("databases" in indexedDB) {
        stack = await indexedDB.databases();
        stack = (stack || []).filter(o => o.name && o.name.startsWith("file:"));
      } else {
        stack = Object.keys(localStorage).filter(e => e.startsWith("file:")).map(e => ({
          "name": e.replace("file:", '')
        }));
      }
      /*  */
      for (const o of stack) {
        const file = new File(o.name);
        await file.open();
        /*  */
        try {
          await file.download({
            "offsets": [],
            "mime": "video/webm",
            "filename": config.recorder.file.name()
          });
        } catch (e) {
          config.notifications.create("Error! could not restore recorded files!");
        }
        /*  */
        file.remove();
      }
    }
  },
  "finalize": function (microphone, desktop) {
    config.recorder.file.data = new File();
    config.recorder.stream = new MediaStream();
    /*  */
    var audio = null;
    var video = desktop.getVideoTracks()[0];
    /*  */
    if (microphone) {
      if (config.options.audio.source.name === "microphone") {
        audio = microphone.getAudioTracks()[0];
      }
      /*  */
      if (config.options.audio.source.name === "mixed") {
        var sources = [];
        var audio_1 = desktop.getAudioTracks()[0];
        var audio_2 = microphone.getAudioTracks()[0];
        /*  */
        sources.push(config.recorder.context.createMediaStreamSource(new MediaStream([audio_1])));
        sources.push(config.recorder.context.createMediaStreamSource(new MediaStream([audio_2])));
        var destination = config.recorder.context.createMediaStreamDestination();
        sources.forEach(function (source) {source.connect(destination)});
        audio = destination.stream.getAudioTracks()[0];
      }
      /*  */
      if (video && audio) {
        config.recorder.stream.addTrack(video);
        config.recorder.stream.addTrack(audio);
      }
    } else {
      if (config.options.audio.source.name === "noaudio") {
        config.recorder.stream.addTrack(video);
      } else { /* system */
        config.recorder.stream = desktop;
      }
    }
    /*  */
    config.recorder.stream.onstop = config.recorder.stop;
    config.recorder.stream.oninactive = config.recorder.stop;
    config.recorder.stream.onremovetrack = config.recorder.stop;
    /*  */
    config.recorder.file.data.open().then(function () {
      config.recorder.engine = new MediaRecorder(config.recorder.stream, {"mimeType": "video/webm"});
      config.recorder.engine.onerror = config.recorder.stop;
      /*  */
      config.recorder.engine.ondataavailable = function (e) {
        if (e.data && e.data.size) {
          config.recorder.file.capture.offset += 1;
          config.recorder.file.capture.progress += 1;
          /*  */
          e.data.arrayBuffer().then(function (buffer) {
            if (buffer) {
              config.recorder.file.tmp.buffer = new Uint8Array(buffer);
              /*  */
              if (config.recorder.file.tmp.buffer) {
                config.recorder.file.data.chunks({
                  "buffer": config.recorder.file.tmp.buffer,
                  "offset": config.recorder.file.capture.offset
                }).then(function () {
                  config.recorder.file.capture.progress -= 1;
                  delete config.recorder.file.tmp.buffer;
                  config.recorder.file.download();
                });
              }
            }
          });
        } else {
          config.recorder.file.download();
        }
      };
      /*  */
      config.recorder.blink.logo();
      config.recorder.blink.status();
      config.recorder.blink.button();
      config.recorder.engine.start();
      config.recorder.start.time = new Date();
      config.element.start.textContent = "STOP";
      /*  */
      if (config.options.inteface.minimize) background.send("state", "minimized");
      if (config.recorder.file.capture.id) window.clearTimeout(config.recorder.file.capture.id);
      config.recorder.file.capture.id = window.setTimeout(config.recorder.loop, config.recorder.timestep);
    });
  },
  "start": {
    "time": null,
    "new": async function () {
      if (navigator) {
        if (navigator.mediaDevices) {
          if (navigator.mediaDevices.getDisplayMedia) {
            try {
              var quality = config.options.quality.name;
              var constraints = {"audio": true, "video": true};
              var factor = quality === "low" ? 0.25 : (quality === "medium" ? 0.5 : (quality === "default" ? 1 : (quality === "high" ? 2 : 1)));
              /*  */
              if (factor !== 1) {
                if (screen.width) {
                  constraints.video = {
                    "width": {
                      "max": screen.width * factor
                    }
                  };
                }
              }
              /*  */
              var desktop = await navigator.mediaDevices.getDisplayMedia(constraints);
              if (desktop) {
                if (navigator.mediaDevices.getUserMedia) {
                  if (config.options.audio.source.name === "mixed" || config.options.audio.source.name === "microphone") {
                    navigator.mediaDevices.getUserMedia({"video": false, "audio": true}).then(function (microphone) {
                      config.recorder.finalize(microphone, desktop);
                    }).catch(function (e) {
                      config.notifications.create("Error! 'microphone' is not allowed!");
                    });
                  } else {
                    config.recorder.finalize(null, desktop);
                  }
                } else {
                  config.notifications.create("Error! 'getUserMedia' is not available on your machine!");
                }
              } else {
                config.notifications.create("Error! recording failed, please try again.");
              }
            } catch (e) {
              config.notifications.create("Recording canceled! please select an option and try again.");
            }
          } else {
            config.notifications.create("Error! 'getDisplayMedia' is not available!");
          }
        } else {
          config.notifications.create("Error! 'mediaDevices' is not available!");
        }
      }
    },
    "old": function () {
      if (chrome) {
        if (chrome.desktopCapture) {
          if (chrome.desktopCapture.chooseDesktopMedia) {
            var context = [config.options.video.source.name];
            if (config.options.audio.source.name !== "noaudio") {
              context.push("audio");
            }
            /*  */
            chrome.desktopCapture.chooseDesktopMedia(context, function (streamId, options) {
              var constraints = {};
              var quality = config.options.quality.name;
              var shareaudio = "canRequestAudioTrack" in options ? options.canRequestAudioTrack : false;
              var factor = quality === "low" ? 0.25 : (quality === "medium" ? 0.5 : (quality === "default" ? 1 : (quality === "high" ? 2 : 1)));
              /*  */
              config.recorder.video.mandatory.chromeMediaSourceId = streamId;
              config.recorder.audio.mandatory.chromeMediaSourceId = streamId;
              /*  */
              if (factor !== 1) {
                if (screen.width) {
                  config.recorder.video.mandatory.maxWidth = screen.width * factor;
                }
              }
              /*  */
              constraints["video"] = config.recorder.video;
              if (shareaudio) constraints["audio"] = config.recorder.audio;
              /*  */
              if (config.options.audio.source.name === "mixed" || config.options.audio.source.name === "microphone") {
                if ("permissions" in navigator) {
                  navigator.permissions.query({"name": "microphone"}).then(function (e) {
                    if (e.state === "prompt" || e.state === "granted") {
                      config.recorder.load(constraints);
                    } else {
                      config.notifications.create("Error! microphone permission is denied!");
                    }
                  });
                } else {
                  config.notifications.create("Error! 'permissions' is not available!");
                }
              } else {
                config.recorder.load(constraints);
              }
            });
          } else {
            config.notifications.create("Error! 'chooseDesktopMedia' is not available!");
          }
        } else {
          config.notifications.create("Error! 'desktopCapture' is not available!");
        }
      }
    }
  }
};