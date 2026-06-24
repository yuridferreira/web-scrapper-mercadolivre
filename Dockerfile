FROM node:20-bookworm-slim

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install
RUN npx playwright install --with-deps --only-shell chromium

COPY . ./
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]
