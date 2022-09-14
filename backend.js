const http = require('http');
const spawn = require('child_process').spawn;
const path = require('path');
const backend = require('git-http-backend');
const zlib = require('zlib');

var server = http.createServer(function (req, res) {
    var repo = req.url.split('/')[1];
    var dir = path.join('/Users/eli/Github', repo);
    var reqStream = req.headers['content-encoding'] == 'gzip' ? req.pipe(zlib.createGunzip()) : req;

    reqStream.pipe(backend(req.url, function (err, service) {
        if (err) return res.end(err + '\n');

        res.setHeader('content-type', service.type);

        var ps = spawn(service.cmd, service.args.concat(dir));
        ps.stdout.pipe(service.createStream()).pipe(ps.stdin);

    })).pipe(res);
});

server.listen(8080);