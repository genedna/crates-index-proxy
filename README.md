## Building the Proxy of Crates Index With Node.js

In Rust, the crates index is a git [repository](https://github.com/rust-lang/crates.io-index). When the developer complies Rust project, the cargo download crates index from [GitHub](https://github.com) and crate files from [registry](https://crates.io). The crates index is a large repository, and it is not easy to download it from the remote. So, I wrote this project of building a proxy of crates index with Nodejs and [pipy](https://flomesh.io).

First, I want to build the proxy of crates with Rust, but I could not find details about how to do or the dataflow between crates.io and cargo. So, I write the simple project with Nodejs for learning and testing.

The project is not for production, it's for learning the crates index mechanism. The project is not perfect, and it has many bugs. If you have any questions, please submit an issue.

### How to Deploy the Proxy of Crates Index

#### 1. Prepare a domain name

1. Buy a domain from [name.com](https://name.com), I already had **rust-lang.pub**, and use **proxy.rust-lang.pub** as proxy domain.
2. Change the nameservers of **rust-lang.pub** to the [DigitalOcean](https://m.do.co/c/bbf00c247f50)'s domains nameservers (_ns1.digitalocean.com_, _ns2.digitalocean.com_ and _ns3.digitalocean.com_).
3. Add **rust-lang.pub** to the [DigitalOcean](https://m.do.co/c/bbf00c247f50)'s domains in the **Networking -> Domains** tab.

#### Prepare a Proxy Server

1. Create a droplet from [DigitalOcean](https://m.do.co/c/bbf00c247f50). The droplet is a virtual machine in the cloud. I chose the droplet with 2GB memory and 2 CPUs. The droplet is located in Singapore. The droplet is running Ubuntu 22.04.

2. Installed [Node.js](https://nodejs.org/en/) and [pipy](https://flomesh.io) on the droplet.
#### 
7. Created a directory `/opt/rust`, and cloned the project of [crates.io-index](https://github.com/rust-lang/crates.io-index) to the directory.
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

### Host and Space Powered By

[![DigitalOcean Referral Badge](https://web-platforms.sfo2.digitaloceanspaces.com/WWW/Badge%202.svg)](https://www.digitalocean.com/?refcode=bbf00c247f50&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge)