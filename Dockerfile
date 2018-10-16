FROM node:8.12.0-alpine

WORKDIR /runner

ADD package*.json /runner/
RUN npm install

ADD cardFire.js /runner

EXPOSE 3001

CMD node active_user_service.js