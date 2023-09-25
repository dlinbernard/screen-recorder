var core = {
  "start": function () {
    core.load();
  },
  "install": function () {
    core.load();
  },
  "load": function () {
    app.interface.id = '';
  },
  "action": {
    "storage": function (changes, namespace) {
      /*  */
    },
    "removed": function (e) {
      if (e === app.interface.id) {
        app.interface.id = '';
      }
    },
    "state": function (state) {
      if (app.interface.id) {
        app.window.get(app.interface.id, function (win) {
          if (win) {
            app.window.update(app.interface.id, {
              "state": state
            });
          }
        });
      }
    },
    "button": function () {
      app.interface.send("button");
      /*  */
      if (app.interface.id) {
        app.window.get(app.interface.id, function (win) {
          if (win) {
            app.window.update(app.interface.id, {"focused": true});
          } else {
            app.interface.id = '';
            app.interface.create(app.interface.path + "?win");
          }
        });
      } else {
        app.interface.create(app.interface.path + "?win");
      }
    }
  }
};

app.button.on.clicked(core.action.button);
app.window.on.removed(core.action.removed);
app.interface.receive("state", core.action.state);

app.on.startup(core.start);
app.on.installed(core.install);
app.on.storage(core.action.storage);
