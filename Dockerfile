FROM node:8.12.0-alpine

WORKDIR /

COPY . .

EXPOSE 3001

RUN ls res/

CMD node cardfire.js