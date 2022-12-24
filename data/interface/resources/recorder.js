config.recorder = {
  "id": 0,
  "final": {},
  "engine": null,
  "stream": null,
  "switch": true,
  "context": null,
  "timestep": 10000,
  "api": {
    "version": null
  },
  "interval": {
    "button": null,
    "status": null,
  },
  "timing": {
    "end": 0,
    "start": 0
  },
  "audio": {
    "mandatory": {
      "chromeMediaSourceId": null,
      "chromeMediaSource": "desktop"
    }
  },
  "video": {
    "mandatory": {
      "chromeMediaSourceId": null,
      "chromeMediaSource": "desktop"
    }
  },
  "loop": function () {
    let recording = config.recorder.engine && config.recorder.engine.state !== "inactive";
    if (recording) config.recorder.engine.requestData();
    /*  */
    if (config.recorder.id) window.clearTimeout(config.recorder.id);
    config.recorder.id = window.setTimeout(config.recorder.loop, config.recorder.timestep);
  },
  "load": function (constraints) {
    if (navigator) {
      if (navigator.mediaDevices) {
        if (navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia(constraints).then(function (desktop) {
            if (config.options.audio.source.name === "mixed" || config.options.audio.source.name === "microphone") {
              navigator.mediaDevices.getUserMedia({"video": false, "audio": true}).then(function (microphone) {
                config.recorder.action(microphone, desktop);
              }).catch(function (e) {
                config.notifications.create("Error! 'microphone' is not allowed!");
              });
            } else {
              config.recorder.action(null, desktop);
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
      let a = "Recording";
      let b = "Recording.";
      let c = "Recording..";
      let d = "Recording...";
      /*  */
      if (config.recorder.interval.status) window.clearInterval(config.recorder.interval.status);
      config.recorder.interval.status = window.setInterval(function () {
        let e = config.element.status.textContent;
        let elapsed = Math.round(((new Date()) - config.recorder.start.time) / 1000);
        /*  */
        config.element.status.textContent = e === a ? b : (e === b ? c : (e === c ? d : a));
        config.element.elapsed.textContent = "Elapsed time: " + config.convert.seconds.to.hhmmss(elapsed);
      }, 500);
    }
  },
  "stop": async function () {
    let tracks = {};
    config.button.icon(null);
    config.recorder.switch = true;
    config.element.status.textContent = '';
    config.element.elapsed.textContent = '';
    config.recorder.timing.end = Date.now();
    config.element.start.textContent = "START";
    config.element.logo.removeAttribute("blink");
    /*  */
    if (config.options.inteface.minimize) background.send("state", "normal");
    if (config.recorder.interval.status) window.clearInterval(config.recorder.interval.status);
    if (config.recorder.interval.button) window.clearInterval(config.recorder.interval.button);
    /*  */
    tracks.a = config.recorder.stream ? config.recorder.stream.getTracks() : [];
    tracks.b = config.recorder.desktop ? config.recorder.desktop.getTracks() : [];
    tracks.c = config.recorder.microphone ? config.recorder.microphone.getTracks() : [];
    tracks.total = [...tracks.a, ...tracks.b, ...tracks.c];
    /*  */
    for (let i = 0; i < tracks.total.length; i++) {
      if (tracks.total[i]) {
        tracks.total[i].stop();
      }
    }
    /*  */
    let recording = config.recorder.engine && config.recorder.engine.state !== "inactive";
    if (recording) {
      config.recorder.engine.stop();
    }
    /*  */
    if (config.recorder.context) {
      await config.recorder.context.close();
      delete config.recorder.context;
    }
  },
  "action": async function (microphone, desktop) {
    config.recorder.desktop = desktop;
    config.recorder.microphone = microphone;
    config.recorder.stream = new MediaStream();
    /*  */
    config.recorder.final.audio = null;
    config.recorder.fileio.ready = false;
    config.recorder.final.video = config.recorder.desktop.getVideoTracks()[0];
    /*  */
    if (config.recorder.microphone) {
      if (config.options.audio.source.name === "microphone") {
        config.recorder.final.audio = config.recorder.microphone.getAudioTracks()[0];
      }
      /*  */
      if (config.options.audio.source.name === "mixed") {
        let sources = [];
        let audio_1 = config.recorder.desktop.getAudioTracks()[0];
        let audio_2 = config.recorder.microphone.getAudioTracks()[0];
        /*  */
        sources.push(config.recorder.context.createMediaStreamSource(new MediaStream([audio_1])));
        sources.push(config.recorder.context.createMediaStreamSource(new MediaStream([audio_2])));
        let destination = config.recorder.context.createMediaStreamDestination();
        sources.forEach(function (source) {source.connect(destination)});
        config.recorder.final.audio = destination.stream.getAudioTracks()[0];
      }
      /*  */
      if (config.recorder.final.video && config.recorder.final.audio) {
        config.recorder.stream.addTrack(config.recorder.final.video);
        config.recorder.stream.addTrack(config.recorder.final.audio);
      }
    } else {
      if (config.options.audio.source.name === "noaudio") {
        config.recorder.stream.addTrack(config.recorder.final.video);
      } else {
        config.recorder.stream = config.recorder.desktop;
      }
    }
    /*  */
    config.recorder.stream.onstop = config.recorder.stop;
    config.recorder.stream.oninactive = config.recorder.stop;
    config.recorder.final.video.onended = config.recorder.stop;
    config.recorder.stream.onremovetrack = config.recorder.stop;
    /*  */
    if (config.options.inteface.streamwrite) {
      if (window.showSaveFilePicker) {
        try {
          const picker = await window.showSaveFilePicker({
            "suggestedName": config.recorder.fileio.filename(),
            "types": [{
              "description": "Desktop Screen Recorder",
              "accept": {
                "video/webm": [".webm"]
              }
            }]
          });
          /*  */
          config.recorder.fileio.new.method = await picker.createWritable();
          config.recorder.fileio.ready = true;
        } catch (e) {
          config.notifications.create("Recording canceled! please select an option and try again.");
        }
      }
    } else {
      try {
        config.recorder.fileio.old.data = new File();
        await config.recorder.fileio.old.data.open();
        config.recorder.fileio.ready = true;
      } catch (e) {
        config.notifications.create("Recording canceled! please select an option and try again.");
      }
    }
    /*  */
    if (config.recorder.fileio.ready) {
      config.recorder.engine = new MediaRecorder(config.recorder.stream, {"mimeType": "video/webm"});
      config.recorder.engine.ondataavailable = config.options.inteface.streamwrite ? config.recorder.fileio.new.process : config.recorder.fileio.old.process;
      config.recorder.engine.onerror = config.recorder.stop;
      /*  */
      config.recorder.blink.logo();
      config.recorder.blink.status();
      config.recorder.blink.button();
      config.recorder.engine.start();
      config.recorder.start.time = new Date();
      config.recorder.timing.start = Date.now()
      config.element.start.textContent = "STOP";
      /*  */
      if (config.options.inteface.minimize) background.send("state", "minimized");
      if (config.recorder.id) window.clearTimeout(config.recorder.id);
      config.recorder.id = window.setTimeout(config.recorder.loop, config.recorder.timestep);
    }
  },
  "start": {
    "time": null,
    "new": async function () {
      if (navigator) {
        if (navigator.mediaDevices) {
          if (navigator.mediaDevices.getDisplayMedia) {
            try {
              let quality = config.options.quality.name;
              let constraints = {"audio": true, "video": true};
              let factor = quality === "low" ? 0.25 : (quality === "medium" ? 0.5 : (quality === "default" ? 1 : (quality === "high" ? 2 : 1)));
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
              let desktop = await navigator.mediaDevices.getDisplayMedia(constraints);
              if (desktop) {
                if (navigator.mediaDevices.getUserMedia) {
                  if (config.options.audio.source.name === "mixed" || config.options.audio.source.name === "microphone") {
                    navigator.mediaDevices.getUserMedia({"video": false, "audio": true}).then(function (microphone) {
                      config.recorder.action(microphone, desktop);
                    }).catch(function (e) {
                      config.notifications.create("Error! 'microphone' is not allowed!");
                    });
                  } else {
                    config.recorder.action(null, desktop);
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
            let context = [config.options.video.source.name];
            if (config.options.audio.source.name !== "noaudio") {
              context.push("audio");
            }
            /*  */
            chrome.desktopCapture.chooseDesktopMedia(context, function (streamId, options) {
              let constraints = {};
              let quality = config.options.quality.name;
              let shareaudio = "canRequestAudioTrack" in options ? options.canRequestAudioTrack : false;
              let factor = quality === "low" ? 0.25 : (quality === "medium" ? 0.5 : (quality === "default" ? 1 : (quality === "high" ? 2 : 1)));
              /*  */
              config.recorder.video.mandatory.chromeMediaSourceId = streamId;
              config.recorder.audio.mandatory.chromeMediaSourceId = streamId;
              config.recorder.audio.mandatory.chromeMediaSource = config.options.audio.mute.while.recording ? "system" : "desktop";
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
                config.permissions.query({"name": "microphone"}).then(function (e) {
                  if (e.state === "prompt" || e.state === "granted" || e.state === "unsupported") {
                    config.recorder.load(constraints);
                  } else {
                    config.notifications.create("Error! microphone permission is denied!");
                  }
                });
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
  },
  "fileio": {
    "blobs": [],
    "blob": null,
    "offsets": [],
    "ready": false,
    "filename": function () {
      const date = (new Date()).toString().toLowerCase().slice(0, 24);
      const filename = "screen-recorder-" + date.replace(/ /g, '-').replace(/:/g, '-') + ".webm";
      /*  */
      return filename;
    },
    "new": {
      "count": 0,
      "method": null,
      "process": async function (e) {
        if (e.data && e.data.size) {
          const cond_1 = ysFixWebmDuration !== undefined;
          const cond_2 = config.options.inteface.seekable;
          const cond_3 = config.recorder.fileio.new.count === 0;
          /*  */
          if (cond_1 && cond_2 && cond_3) { // fix webm duration
            config.recorder.fileio.blobs.push(e.data);
            config.recorder.fileio.blob = await ysFixWebmDuration(e.data, 10000, {"logger": false});
          } else {
            config.recorder.fileio.blob = e.data;
          }
          /*  */
          if (config.recorder.fileio.blob) {
            await config.recorder.fileio.new.method.write(config.recorder.fileio.blob);
            delete config.recorder.fileio.blob;
          }
        }
        /*  */
        config.recorder.fileio.new.count++;
        config.recorder.fileio.new.finalize();
      },
      "finalize": async function () {
        let inactive = config.recorder.engine && config.recorder.engine.state === "inactive";
        if (inactive) {
          config.element.status.textContent = "Processing the video, please wait...";
          /*  */
          window.setTimeout(function () {
            if (config.recorder.id) {
              window.clearTimeout(config.recorder.id);
            }
            /*  */
            window.setTimeout(async function () {
              const cond_1 = ysFixWebmDuration !== undefined;
              const cond_2 = config.options.inteface.seekable;
              const cond_3 = config.recorder.fileio.blobs[0] !== undefined;
              /*  */
              if (cond_1 && cond_2 && cond_3) { // fix webm duration
                const blob = config.recorder.fileio.blobs[0];
                const duration = config.recorder.timing.end - config.recorder.timing.start;
                config.recorder.fileio.blob = await ysFixWebmDuration(blob, duration, {"logger": false});
                /*  */
                await config.recorder.fileio.new.method.write({
                  "position": 0,
                  "type": "write",
                  "data": config.recorder.fileio.blob
                });
              }
              /*  */
              config.recorder.fileio.new.method.close();
              config.element.status.textContent = '';
              config.recorder.fileio.new.count = 0;
              config.recorder.fileio.blobs = [];
              /*  */
              delete config.recorder.engine;
              delete config.recorder.stream;
              delete config.recorder.desktop;
              delete config.recorder.microphone;
              delete config.recorder.fileio.blob;
            }, 300);
          }, 300);
        }
      }
    },
    "old": {
      "count": 0,
      "data": null,
      "disk": {
        "id": null
      },
      "capture": {
        "offset": 0,
        "progress": 0
      },
      "restore": async function () {
        let stack = null;
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
              "filename": config.recorder.fileio.filename()
            });
          } catch (e) {
            config.notifications.create("Error! could not restore recorded files!");
          }
          /*  */
          file.remove();
        }
      },
      "process": async function (e) {
        if (e.data && e.data.size) {
          config.recorder.fileio.old.capture.offset += 1;
          config.recorder.fileio.old.capture.progress += 1;
          /*  */
          const cond_1 = ysFixWebmDuration !== undefined;
          const cond_2 = config.options.inteface.seekable;
          const cond_3 = config.recorder.fileio.old.count === 0;
          /*  */
          if (cond_1 && cond_2 && cond_3) { // fix webm duration
            config.recorder.fileio.blobs.push(e.data);
            config.recorder.fileio.offsets.push(config.recorder.fileio.old.capture.offset);
            config.recorder.fileio.blob = await ysFixWebmDuration(e.data, 10000, {"logger": false});
          } else {
            config.recorder.fileio.blob = e.data;
          }
          /*  */
          config.recorder.fileio.buffer = await config.recorder.fileio.blob.arrayBuffer();
          config.recorder.fileio.unit8buffer = new Uint8Array(config.recorder.fileio.buffer);
          /*  */
          if (config.recorder.fileio.unit8buffer) {
            await config.recorder.fileio.old.data.chunks({
              "buffer": config.recorder.fileio.unit8buffer,
              "offset": config.recorder.fileio.old.capture.offset
            });
            /*  */
            config.recorder.fileio.old.capture.progress -= 1;
            config.recorder.fileio.old.download();
            config.recorder.fileio.old.count++;
            /*  */
            delete config.recorder.fileio.unit8buffer;
            delete config.recorder.fileio.buffer;
            delete config.recorder.fileio.blob;
          }
        } else {
          config.recorder.fileio.old.download();
        }
      },
      "download": function () {
        let inactive = config.recorder.engine && config.recorder.engine.state === "inactive";
        if (inactive && config.recorder.fileio.old.capture.progress === 0) {
          config.element.status.textContent = "Processing the video, please wait...";
          /*  */
          window.setTimeout(async function () {
            if (config.recorder.id) {
              window.clearTimeout(config.recorder.id);
            }
            /*  */
            const cond_1 = ysFixWebmDuration !== undefined;
            const cond_2 = config.options.inteface.seekable;
            const cond_3 = config.recorder.fileio.blobs[0] !== undefined;
            const cond_4 = config.recorder.fileio.offsets[0] !== undefined;
            /*  */
            if (cond_1 && cond_2 && cond_3 && cond_4) { // fix webm duration
              const blob = config.recorder.fileio.blobs[0];
              const offset = config.recorder.fileio.offsets[0];
              const duration = config.recorder.timing.end - config.recorder.timing.start;
              config.recorder.fileio.blob = await ysFixWebmDuration(blob, duration, {"logger": false});
              config.recorder.fileio.buffer = await config.recorder.fileio.blob.arrayBuffer();
              config.recorder.fileio.unit8buffer = new Uint8Array(config.recorder.fileio.buffer);
              /*  */
              const db = config.recorder.fileio.old.data.db;
              const transaction = db.transaction("chunks", "readwrite");
              const store = transaction.objectStore("chunks");
              store.delete(offset);
              /*  */
              await new Promise(resolve => transaction.oncomplete = resolve);
              await config.recorder.fileio.old.data.chunks({
                "offset": offset,
                "buffer": config.recorder.fileio.unit8buffer
              });
            }
            /*  */
            config.recorder.fileio.old.data.download({
              "offsets": [],
              "mime": "video/webm",
              "filename": config.recorder.fileio.filename()
            }).then(function (e) {
              if (e.state === "complete") {
                window.setTimeout(function () {
                  config.recorder.fileio.blobs = [];
                  config.recorder.fileio.offsets = [];
                  config.recorder.fileio.old.count = 0;
                  config.element.status.textContent = '';
                  config.recorder.fileio.old.disk.id = e.id;
                  config.recorder.fileio.old.data.remove();
                  /*  */
                  delete config.recorder.engine;
                  delete config.recorder.stream;
                  delete config.recorder.desktop;
                  delete config.recorder.microphone;
                  delete config.recorder.fileio.blob;
                  delete config.recorder.fileio.buffer;
                  delete config.recorder.fileio.unit8buffer;
                }, 300);
              } else {
                config.notifications.create("Error! could not write the result to disk!");
                config.element.status.textContent = "Error! could not write the result to disk!";
              }
            }).catch(function (e) {
              config.notifications.create("Error! could not write the result to disk!");
              config.element.status.textContent = "Error! could not write the result to disk!";
            });
          }, 300);
        }
      }
    }
  }
};