var http = require('http');
var render = require('./lib/render');
var port = process.env.PORT || 8080;
var async = require('async');
var fs = require('fs');

http.createServer(function(req, res) {
  if (req.url != '/') {
    res.writeHead(404);
    res.end('404 - not found');
    return;
  }

  async.waterfall([
    function(next) {
      render(__dirname+'/protocol.md', next);
    },
    function(html, next) {
      fs.readFile(__dirname + '/style.css', 'utf-8', function(err, css) {
        next(err, html, css);
      });
    },
    function(html, css) {
      var doc =
        '<style>'+css+'</style>' +
        '<div id="container">'+html+'</div>';

      res.writeHead(200, {'Content-Type': 'text/html; charset=utf8'});
      res.end(doc);
    },
  ], function(err, html) {
      if (err) {
        res.writeHead(500);
        res.end(err.message);
        return;
      }
  });
}).listen(port, function() {
  console.log('listening on http://localhost:'+port);
});
