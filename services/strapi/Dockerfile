FROM node:22-bookworm-slim

WORKDIR /opt/strapi

COPY package.json ./
RUN npm install

COPY . .

RUN mkdir -p /opt/strapi/public/uploads

EXPOSE 1337

CMD ["npm", "run", "develop"]
