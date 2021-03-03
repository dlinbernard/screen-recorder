var core = {
  "start": function () {
    core.load();
  },
  "install": function () {
    core.load();
  },
  "load": function () {
    app.interface.id = '';
  }
};

app.interface.receive("state", function (state) {
  if (app.interface.id) {
    app.window.get(app.interface.id, function (win) {
      if (win) {
        app.window.update(app.interface.id, {"state": state});
      }
    });
  }
});

app.window.on.removed(function (e) {
  if (e === app.interface.id) {
    app.interface.id = '';
  }
});

app.button.on.clicked(function () {
  app.interface.send("button");
  /*  */
  if (app.interface.id) {
    app.window.get(app.interface.id, function (win) {
      if (win) {
        app.window.update(app.interface.id, {"focused": true});
      } else {
        app.interface.id = '';
        app.interface.create();
      }
    });
  } else {
    app.interface.create();
  }
});

app.on.startup(core.start);
app.on.installed(core.install);