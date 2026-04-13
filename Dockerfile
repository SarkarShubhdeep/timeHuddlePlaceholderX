# Multi-stage production image for Meteor 3 (Render, Fly, etc.)
# Build context: repository root. Target platform: linux/amd64 (Render).

ARG METEOR_RELEASE=3.4

FROM --platform=linux/amd64 node:22-bookworm AS builder

ARG METEOR_RELEASE
WORKDIR /app

ENV METEOR_ALLOW_SUPERUSER=true \
    DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL "https://install.meteor.com/?release=${METEOR_RELEASE}" | sh
ENV PATH="/root/.meteor:${PATH}"

COPY package.json package-lock.json ./
COPY .meteor ./.meteor

RUN meteor npm ci

COPY . .

RUN meteor build /tmp/meteor-out --directory --server-only

# --- runtime ---

FROM --platform=linux/amd64 node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    BIND_IP=0.0.0.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /tmp/meteor-out/bundle ./

RUN cd programs/server && npm install

COPY scripts/render-start.sh ./scripts/render-start.sh
RUN chmod +x ./scripts/render-start.sh

EXPOSE 3000

CMD ["./scripts/render-start.sh"]
