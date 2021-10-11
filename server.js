var http = require('http');
var httpreq = require('./lib/httprequest.js');
var arex = require('./lib/arex.js');

var hostname = '0.0.0.0';
var port = 3824;

var server = http.createServer((req, res) => {

    var chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    res.statusCode = 200;
    req.on('end', () => {
        res.setHeader('Content-Type', 'application/json');
        try {
            var data = Buffer.concat(chunks);
            var json_data = JSON.parse(data.toString());
            httpreq.get(json_data['url'],(err,body)=>{
              if(err)res.end('{}');
              else {
                var result = arex.get_article_sync(body, json_data['size']||200, json_data['smooth']);
                res.end(JSON.stringify(result));
              }
            });
        } catch (e) {
            //console.error(e);
            res.end('{}');
        }
    });
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});