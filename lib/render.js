// This code renders the protocol.md file into html and adds a table of content.
// It's not pretty, but it gets the job done ; )

var robotskirt = require('robotskirt');
var fs = require('fs');
  
module.exports = function render(filename, cb) {
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

    return '<h'+(level+1)+' id="'+id+'">'+prefix+title+'</h'+(level+1)+'>';
  };

  var md = new robotskirt.Markdown(renderer, [robotskirt.EXT_FENCED_CODE]);
  fs.readFile(filename, 'utf-8', function(err, markdown) {
    if (err) return cb(err);

    var html = md.render(markdown);
    cb(null, toc+html)
  })
}
