FROM node:24-alpine AS builder

RUN apk add --no-cache bash openssl
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm install --legacy-peer-deps

COPY . .
RUN npx prisma generate
RUN npm run build


# ================== RUNTIME ==================
FROM node:24-alpine

RUN apk add --no-cache bash openssl

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 5001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
