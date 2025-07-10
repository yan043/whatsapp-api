FROM node:latest

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 6969

CMD ["npm", "start"]