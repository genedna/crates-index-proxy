pipy()
    .listen('128.199.81.204:80')
    .demuxHTTP().to(
        $ => $.muxHTTP().to(
            $ => $.connect('localhost:6789')
        )
    )

    .listen('[2400:6180:0:d0::7d:9001]:80')
        .demuxHTTP().to(
        $ => $.muxHTTP().to(
            $ => $.connect('localhost:6789')
        )
    )

    .listen('128.199.81.204:443')
    .link('req')

    .listen('[2400:6180:0:d0::7d:9001]:443')
    .link('req')

    .pipeline('req')
    .acceptTLS({
        certificate: {
            cert: new crypto.CertificateChain(os.readFile('/etc/letsencrypt/live/rust-lang.pub/fullchain.pem')),
            key: new crypto.PrivateKey(os.readFile('/etc/letsencrypt/live/rust-lang.pub/privkey.pem')),
        }
    }).to('inbound-http')

    .pipeline('inbound-http')
    .demuxHTTP().to(
        $ => $.muxHTTP().to(
            $ => $.connect('localhost:6789')
        )
    )