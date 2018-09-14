const { basename } = require("path");
const mixer = require("svg-mixer");

module.exports = require("enb/lib/build-flow")
  .create()
  .name("svg")
  .target("target", "?.svg")
  .defineOption("mixer", {
    spriteConfig: { usages: false },
    generateSymbolId: file => basename(file, ".svg")
  })
  .dependOn("deps", "?.deps.js")
  .useFileList("svg")
  .builder(function(files) {
    return mixer(files.map(({ fullname }) => fullname), this._mixer).then(
      ({ content }) => content
    );
  })
  .createTech();
