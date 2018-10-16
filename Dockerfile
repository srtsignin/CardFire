FROM node:8.12.0-alpine

WORKDIR /

COPY . .

EXPOSE 3001

CMD node cardfire.js