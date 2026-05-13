FROM node:24-alpine

WORKDIR /app

# install curl and build tools for native modules (like bcrypt)
RUN apk add --no-cache curl python3 make g++

# Install pnpm
RUN npm install -g pnpm@9

ENV PNPM_ONLY_BUILT_DEPENDENCIES_ALLOW_ALL=true

COPY package.json pnpm-lock.yaml .npmrc prisma.config.ts tsconfig.json ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

EXPOSE 5001

CMD ["pnpm", "run", "start"]
