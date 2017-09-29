
FROM node:8.6.0-alpine

ADD src /app

RUN cd /app && npm install

CMD ["node", "/app/index.js"]
