FROM node:16-alpine
RUN apk add --no-cache libc6-compat git
# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./


# If you are building your code for production
RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 6789
CMD [ "node", "crates-index-proxy.js" ]