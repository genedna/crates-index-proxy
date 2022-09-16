## Building the Proxy of Crates Index With Node.js

In Rust, the crates index is a git [repository](https://github.com/rust-lang/crates.io-index). When the developer complies rust projects, the crates index will be downloaded from [GitHub](https://github.com). The crates index is a large repository, and it is not easy to download it from the remote. So, I wrote this project of building a proxy of crates index with Nodejs and [pipy](https://flomesh.io).

### How to Deploy the Proxy of Crates Index

1. Brought a droplet from [DigitalOcean](https://www.digitalocean.com/). The droplet is a virtual machine in the cloud. I chose the droplet with 2GB memory and 2 CPUs. The droplet is located in Singapore. The droplet is running Ubuntu 22.04.
2. Brought a domain from [name.com](https://name.com) is **rust-lang.pub**, and use **proxy.rust-lang.pub** as proxy domain.
3. Installed [Node.js](https://nodejs.org/en/) and [pipy](https://flomesh.io) on the droplet.
4. Created a directory `/opt/rust`, and cloned the project of [crates.io-index](https://github.com/rust-lang/crates.io-index) to the directory.
```bash
mkdir /opt/rust
cd /opt/rust && git clone https://github.com/rust-lang/crates.io-index.git
```
5. Created a crontab job to update the crates index every 1 minutes.
```bash
# crontab -e
*/1 * * * * cd /opt/rust/crates.io-index && git pull
```
6. Clone the project to the droplet.
```bash
cd /opt/rust && git clone https://github.com/genedna/crates-index-proxy.git
```
7. Install the dependencies of the project.
```bash
cd /opt/rust/crates-index-proxy && npm install
```
8. Start the proxy of crates index.
```bash
cd /opt/rust/crates-index-proxy && node crates && node crates-index-proxy.js 
```
9. Configured the DNS of the domain **rust-lang.pub** to the droplet.
10. Configured the SSL certificate of the domain **rust-lang.pub** with [Let's Encrypt](https://letsencrypt.org/).
```bash
snap install --classic certbot
ln -s /snap/bin/certbot /usr/bin/certbot
snap set certbot trust-plugin-with-root=ok
snap install certbot-dns-digitalocean
# $HOME/.secrets/certbot/digitalocean.ini
chmod 400 $HOME/.secrets/certbot/digitalocean.ini
certbot certonly --dns-digitalocean --dns-digitalocean-credentials ~/.secrets/certbot/digitalocean.ini -d rust-lang.pub -d '*.rust-lang.pub'
```
11. Configured the [pipy](https://flomesh.io) to proxy the domain **proxy.rust-lang.pub**.
```javascript
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
```
12. Run pipy for reserving the proxy of crates index.
```bash
pipy proxy.js
```

### LICENSE

[MIT](LICENSE) 