FROM node:8.12.0-alpine

WORKDIR /runner

COPY . .

EXPOSE 3001

CMD node cardfire.js