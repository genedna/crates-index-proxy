const http = require('http');
const spawn = require('child_process').spawn;
const path = require('path');
const zlib = require('zlib');

const backend = require('git-http-backend');

const config = require('./config.json');

const server = http.createServer(function (req, res) {
    let repo = req.url.split('/')[1];

    if (repo.endsWith('.git')) {
        repo = repo.slice(0, -4);
    }

    if (repo !== config.repo) {
        res.writeHead(404);
        res.end('Not found');
        return;
    }

    let dir = path.join(config.root, repo);

    let reqStream = req.headers['content-encoding'] === 'gzip' ? req.pipe(zlib.createGunzip()) : req;

    reqStream.pipe(
        backend(
            req.url, function (err, service) {
                if (err) return res.end(err + '\n');

                if (service.cmd === 'git-upload-pack') {
                    res.setHeader('content-type', service.type);
                    var ps = spawn(service.cmd, service.args.concat(dir));
                    ps.stdout.pipe(service.createStream()).pipe(ps.stdin);
                } else if (service.cmd === 'git-receive-pack') {
                    res.writeHead(500);
                    res.end('Not allowed receive pack');
                } else {
                    res.writeHead(500);
                    res.end('Not allowed');
                }
            })).pipe(res);
});

server.listen(6789);