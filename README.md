## Building the Proxy of Crates Index With Node.js

In Rust, the crates index is a git [repository](https://github.com/rust-lang/crates.io-index). When the developer complies Rust project, the cargo download crates index from [GitHub](https://github.com) and crate files from [registry](https://crates.io). The crates index is a large repository, and it is not easy to download it from the remote. So, I wrote this project of building a proxy of crates index with Nodejs and [pipy](https://flomesh.io).

First, I want to build the proxy of crates with Rust, but I could not find details about how to do or the dataflow between crates.io and cargo. So, I write the simple project with Nodejs for learning and testing.

The project is not for production, it's for learning the crates index mechanism. The project is not perfect, and it has many bugs. If you have any questions, please submit an issue.

### How to Deploy the Proxy of Crates Index

#### 1. Prepare a domain name

1. Buy a domain from [name.com](https://name.com), I already had **rust-lang.pub**, and use **proxy.rust-lang.pub** as proxy domain.
2. Change the nameservers of **rust-lang.pub** to the [DigitalOcean](https://m.do.co/c/bbf00c247f50)'s domains nameservers (`ns1.digitalocean.com`, `ns2.digitalocean.com` and `ns3.digitalocean.com`).
3. Add **rust-lang.pub** to the [DigitalOcean](https://m.do.co/c/bbf00c247f50)'s domains in the **Networking -> Domains** tab.

#### 2. Prepare a Proxy Server

1. Create a droplet from [DigitalOcean](https://m.do.co/c/bbf00c247f50). I chose a droplet with 8GB memory and 4 CPUs located in Singapore, and the droplet is running Ubuntu 22.04.
   >Please note that the droplet use the **root** user.
2. Installed [Rust](https://rust-lang.org), [Golang](https://golang.dev), [Node.js](https://nodejs.org/en/) and [pipy](https://flomesh.io) on the droplet.
   ```bash
   $ # Install dependencies packages
   $ apt install clang make cmake libssl-dev pkg-config vim-nox
   $ # Install Rust
   $ curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   $ # Install Golang 
   $ wget https://golang.org/dl/go1.19.1.linux-amd64.tar.gz
   $ tar -xzvf go1.19.1.linux-amd64.tar.gz
   $ rm go1.19.1.linux-amd64.tar.gz
   $ # Install Node.js
   $ wget https://nodejs.org/dist/v18.10.0/node-v18.10.0-linux-x64.tar.xz
   $ xz -d node-v18.10.0-linux-x64.tar.xz
   $ tar -xvf node-v18.10.0-linux-x64.tar
   $ mv node-v18.10.0-linux-x64 node && rm node-v18.10.0-linux-x64.tar
   $ # Add the path to the environment variable
   $ echo "export PATH=$PATH:/root/go/bin:/root/node/bin" >> ~/.bashrc
   $ # Build and install pipy
   $ git clone https://github.com/flomesh-io/pipy.git
   $ cd pipy
   $ ./build.sh
   $ cp ./bin/* /usr/local/bin
   ```
#### 3. Prepare the domain and certificates

1. Add a subdomain like **proxy.rust-lang.pub** direct to the droplet in the **Networking -> Domains -> rust-lang.pub -> crate new record** tab.
2. Install [certbot](https://certbot.eff.org) on the droplet, and get the certificates.
   ```bash
   $ snap install --classic certbot
   $ ln -s /snap/bin/certbot /usr/bin/certbot
   $ snap set certbot trust-plugin-with-root=ok
   $ snap install certbot-dns-digitalocean
   $ # Add a token file in $HOME/.secrets/certbot/digitalocean.ini, and the file content is:
   $ # dns_digitalocean_token = <your digitalocean token>
   $ # The token can be generate in the DigitalOcean -> API -> Tokens
   $ # Get the certificates
   $ chmod 400 $HOME/.secrets/certbot/digitalocean.ini
   $ certbot certonly --dns-digitalocean --dns-digitalocean-credentials ~/.secrets/certbot/digitalocean.ini -d rust-lang.pub -d '*.rust-lang.pub'
   ```

#### 4. Prepare the index of crates

1. Clone the crates index repository.
   ```bash
   $ mkdir /opt/rust
   $ cd /opt/rust && git clone https://github.com/rust-lang/crates.io-index.git
   ```
2. Create a cron job to update the crates index repository.
   ```shell
   #!/bin/bash
   
   cd /opt/rust/crates.io-index || exit
   git fetch
   git merge origin/master --no-edit
   git prune
   
   exit 0
   ```
3. Add the cron job to the crontab.
   ```bash
   $ crontab -e
   $ # Add the following line to the crontab file
   $ */1 * * * * /bin/bash /opt/rust/proxy/cron/cron-pull-crates-index.sh
   ```
4. Restart the cron service.
   ```bash
   $ systemctl restart cron
   $ systemctl enable cron
   ```

#### 5. Run the git http backend server

1. Clone the project to the droplet.
   ```bash
   $ screen
   $ cd /opt/rust && git clone https://github.com/genedna/crates-index-proxy.git
   $ cd crates-index-proxy && node crates-index-proxy.js
   ```

#### 6. Run the pipy server

1. Configured the [pipy](https://flomesh.io) to proxy the domain **proxy.rust-lang.pub**.
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

2. Run pipy for reserving the proxy of crates index.
   ```bash
   $ screen
   $ pipy proxy.js
   ```

#### 7. Sync crates.io-index and crate files with Freighter

Now [we](https://github.com/open-rust-Initiative) are working on a __pure__ Rust registry projects named [Freighter](https://github.com/open-rust-Initiative/freighter).

1. Clone the project to the droplet and build.
   ```bash
   $ git clone https://github.com/open-rust-Initiative/freighter.git
   $ cd freighter
   $ cargo build --release
   $ cp ./target/release/freighter /usr/local/bin
   ```

2. Sync the crates.io-index with Freighter.
   ```bash
   $ freighter sync pull && freighter sync -t 32 -c /opt/rust download --init
   ```

3. Sync the crates files with Freighter.
   ```bash
   $ crontab -e
   $ # Add the following line to the crontab file
   $ */1 * * * * freighter sync pull && freighter sync -t 32 -c /opt/rust download
   ```

#### 8. Management DigitalOcean Space with s3cmd

1. Install `s3cmd` 

   ```shell
   $ apt install s3cmd
   ```

2. Configure `s3cmd` 

   ```shell
   $ s3cmd --configure
   ```

### TODO List

  * [ ] Cache the crate files from the crates.io.
  * [ ] Upload the crate files to the DigitalOcean Spaces.
  * [ ] Rewrite the `config.json` of index repository to use the DigitalOcean Spaces.

### LICENSE

[MIT](LICENSE) 

### Host and Space Powered By

[![DigitalOcean Referral Badge](https://web-platforms.sfo2.digitaloceanspaces.com/WWW/Badge%202.svg)](https://www.digitalocean.com/?refcode=bbf00c247f50&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge)