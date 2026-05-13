FROM node:24-alpine

WORKDIR /app

# 🔥 install curl and build tools for native modules (like bcrypt)
RUN apk add --no-cache curl python3 make g++

COPY package*.json ./
COPY prisma ./prisma

RUN npm install --frozen-lockfile || npm install
RUN npx prisma generate

COPY . .

RUN npm run build

EXPOSE 5001

CMD ["npm", "run", "start"]
