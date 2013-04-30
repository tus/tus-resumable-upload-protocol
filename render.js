#!/usr/bin/env node
var render = require('./lib/render');
render(process.argv[2], function(err, html) {
  if (err) throw err;

  console.log(html);
});
