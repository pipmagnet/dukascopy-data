
FROM node:8.6.0-alpine

ADD src /app

RUN cd /app && npm install

RUN cd /app && npm test

CMD ["node", "/app/index.js"]
