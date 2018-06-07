
FROM node:8.6.0-alpine

WORKDIR /usr/src/app

COPY src/package*.json ./

RUN npm install

COPY src/. ./

CMD ["npm", "start"]
