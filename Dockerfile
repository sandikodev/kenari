FROM oven/bun:1.3-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1.3-alpine
WORKDIR /app
RUN mkdir -p /app/data
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000
ENV HOST=0.0.0.0 PORT=3000 NODE_ENV=production
ENV BUN_RUNTIME_TRANSPILER_CACHE_PATH=0
CMD ["bun", "--smol", "./build/index.js"]
