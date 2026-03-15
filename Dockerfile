FROM node:20-alpine

WORKDIR /app

# 🔥 install curl
RUN apk add --no-cache curl

COPY package*.json ./
COPY prisma ./prisma

RUN npm install
RUN npx prisma generate

COPY . .

RUN npm run build

EXPOSE 5001

CMD ["npm", "run", "start"]
