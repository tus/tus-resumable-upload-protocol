// This code renders the protocol.md file into html and adds a table of content.
// It's not pretty, but it gets the job done ; )

var http = require('http');
var robotskirt = require('robotskirt');
var fs = require('fs');
  
var toc = [];
var port = process.env.PORT || 8080;

http.createServer(function(req, res) {
  if (req.url != '/') {
    res.writeHead(404);
    res.end('404 - not found');
    return;
  }

  renderProtocol(function(err, html) {
    if (err) {
      res.writeHead(500);
      res.end(err);
      return;
    }

    res.writeHead(200, {'Content-Type': 'text/html; charset=utf8'});
    res.end(html);
  });
}).listen(port, function() {
  console.log('listening on http://localhost:'+port);
});

function renderProtocol(cb) {
  var renderer = new robotskirt.HtmlRenderer();
  var header = renderer.header;
  var toc = '';

  var prevLevel = 0;
  var counters = [];

  renderer.header = function (title, level) {
    if (level === 1) {
      return header(title, level);
    }
    level--;

    counters[level-1] = (counters[level-1] || 0) + 1;
    if (level < prevLevel) {
      for (var i = 0; i < prevLevel - level; i++) {
        counters.pop();
      }
    }
    var prefix = counters.join('.')+'. ';
    if (level > prevLevel) {
      toc += '<ol>';
    } else if (level < prevLevel) {
      toc += Array(prevLevel - level + 1).join('</ol>');
    }
    var id = counters.join('-');
    toc += '<li><a href="#'+id+'">'+prefix+title+'</a></li>';
    prevLevel = level;

    return '<h'+level+' id="'+id+'">'+prefix+title+'</h'+level+'>';
  };

  var md = new robotskirt.Markdown(renderer);
  fs.readFile(__dirname + '/protocol.md', 'utf-8', function(err, markdown) {
    if (err) return cb(err);

    fs.readFile(__dirname + '/style.css', 'utf-8', function(err, css) {
      if (err) return cb(err);

      var html = md.render(markdown);
      var result =
        '<style>'+css+'</style>' +
        '<div id="container">'+toc+html+'</div>';

      cb(null, result);
    });
  })
}
