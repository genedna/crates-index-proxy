(
    (
        reg = new RegExp('\/crates\/([^/]+)\/([^/]+)\/download'),
    ) => pipy({})
        // IPv4
        .listen('46.101.121.237:443')
        .link('req')

        .pipeline('req')
        .acceptTLS({
            certificate: {
                cert: new crypto.CertificateChain(os.readFile('/etc/letsencrypt/live/rust-lang.pub/fullchain.pem')),
                key: new crypto.PrivateKey(os.readFile('/etc/letsencrypt/live/rust-lang.pub/privkey.pem')),
            }
        }).to('inbound-http')

        .pipeline('inbound-http')
        .demuxHTTP().to($=>$
            .handleMessageStart(
                (msg, result) => (
                    result = reg.exec(msg.head.path),
                    result && (
                        msg.head.headers.host = 'files.rust-lang.pub',
                        msg.head.path = `/crates/${result[1]}/${result[1]}-${result[2]}.crate`
                    )
                )
            )
            .muxHTTP().to($=>$
                .connectTLS({
                    sni: 'files.rust-lang.pub'
                }).to($=>$.connect('files.rust-lang.pub:443'))
            )
        )

        // IPv6
        .listen('[2a03:b0c0:3:d0::188a:8001]:443')
        .link('req')

        .pipeline('req')
        .acceptTLS({
            certificate: {
                cert: new crypto.CertificateChain(os.readFile('/etc/letsencrypt/live/rust-lang.pub/fullchain.pem')),
                key: new crypto.PrivateKey(os.readFile('/etc/letsencrypt/live/rust-lang.pub/privkey.pem')),
            }
        }).to('inbound-http')

        .pipeline('inbound-http')
        .demuxHTTP().to($=>$
            .handleMessageStart(
                (msg, result) => (
                    result = reg.exec(msg.head.path),
                    result && (
                        msg.head.headers.host = 'files.rust-lang.pub',
                            msg.head.path = `/crates/${result[1]}/${result[1]}-${result[2]}.crate`
                    )
                )
            )
            .muxHTTP().to($=>$
                .connectTLS({
                    sni: 'files.rust-lang.pub'
                }).to($=>$.connect('files.rust-lang.pub:443'))
            )
        )
)()