var http = require('http');
var robotskirt = require('robotskirt');
var fs = require('fs');
  
var toc = [];

http.createServer(function(req, res) {
  renderProtocol(function(err, html) {
    if (err) {
      res.writeHead(500);
      res.end(err);
      return;
    }

    res.writeHead(200, {'Content-Type': 'text/html; charset=utf8'});
    res.end(html);
  });
}).listen(8080);

function renderProtocol(cb) {
  var renderer = new robotskirt.HtmlRenderer();
  var header = renderer.header;
  var toc = [];

  var prevLevel = 0;
  var counters = [];

  renderer.header = function (title, level) {
    if (level === 1) {
      return header(title, level);
    }
    level--;

    counters[level-1] = (counters[level-1] || 0) + 1;
    if (prevLevel > level) {
      counters.pop();
    }
    prevLevel = level;

    var prefix = counters.join('.')+' ';
    toc.push(prefix+title);
    return header(prefix+title, level);
  };

  var md = new robotskirt.Markdown(renderer, ~0);
  fs.readFile(__dirname + '/README.md', 'utf-8', function(err, markdown) {
    if (err) {
      cb(null, html);
      return;
    }
    var html = md.render(markdown);
    console.log(toc);
    cb(null, html);
  })
}
