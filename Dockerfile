FROM node:6.17.0-alpine
WORKDIR /app
COPY . /app
CMD ["sh", "-c", "node server.js"]
EXPOSE 3824