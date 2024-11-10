var config = {};

config.welcome = {
  set lastupdate (val) {app.storage.write("lastupdate", val)},
  get lastupdate () {return app.storage.read("lastupdate") !== undefined ? app.storage.read("lastupdate") : 0}
};

config.interface = {
  set size (val) {app.storage.write("interface.size", val)},
  get size () {return app.storage.read("interface.size") !== undefined ? app.storage.read("interface.size") : config.interface.default.size},
  "default": {
    "size": {
      "width": 1150, 
      "height": 750
    }
  }
};
