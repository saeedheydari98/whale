FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

RUN apk add --no-cache openssl
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

## Copy only the standalone package.json and server runtime (avoid copying host node_modules)
COPY .next/standalone/package.json ./package.json
COPY .next/standalone/server.js ./server.js
COPY .next/standalone/.next ./.next
COPY .next/static ./.next/static
COPY package-lock.json ./package-lock.json
COPY public ./public
COPY prisma ./prisma

# Ensure any node_modules copied from the host are removed so we install for Linux
RUN rm -rf node_modules /app/node_modules || true
# Install production dependencies and generate Prisma client for the container platform
RUN npm ci --omit=dev

RUN npx prisma generate --schema=./prisma/schema.prisma

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
