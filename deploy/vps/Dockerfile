ARG NODE_IMAGE=node:24-bookworm-slim
FROM ${NODE_IMAGE}

ENV NODE_ENV=production \
    KIRIN_DEPLOYMENT=server \
    PUBLIC_ORIGIN=https://kirinsounds.art \
    DATA_DIR=/data \
    PORT=4173

WORKDIR /app

# The VPS backend uses only Node built-ins. No npm install or Vinext build is
# needed, and the image never receives local .data or deployment credentials.
COPY --chown=node:node public/ ./public/
COPY --chown=node:node data/seed-content.json ./data/seed-content.json
COPY --chown=node:node server/*.mjs ./server/
COPY --chown=node:node server.mjs ./server.mjs
COPY --chown=node:node deploy/vps/healthcheck.mjs ./healthcheck.mjs

RUN mkdir -p /data && chown node:node /data && chmod 700 /data

USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD ["node", "/app/healthcheck.mjs"]
CMD ["node", "server.mjs"]
