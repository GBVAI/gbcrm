# Twenty CRM - Server
# Build from source for custom deployments

# Base image for common dependencies
FROM node:24-alpine AS common-deps

WORKDIR /app

# Copy only the necessary files for dependency resolution
COPY ./package.json ./yarn.lock ./.yarnrc.yml ./tsconfig.base.json ./nx.json /app/
COPY ./.yarn/releases /app/.yarn/releases
COPY ./.yarn/patches /app/.yarn/patches

# Copy ALL workspace package.json files so yarn can resolve workspace references
COPY ./packages/twenty-emails/package.json /app/packages/twenty-emails/
COPY ./packages/twenty-server/package.json /app/packages/twenty-server/
COPY ./packages/twenty-server/patches /app/packages/twenty-server/patches
COPY ./packages/twenty-ui/package.json /app/packages/twenty-ui/
COPY ./packages/twenty-shared/package.json /app/packages/twenty-shared/
COPY ./packages/twenty-front/package.json /app/packages/twenty-front/
COPY ./packages/twenty-sdk/package.json /app/packages/twenty-sdk/
COPY ./packages/twenty-client-sdk/package.json /app/packages/twenty-client-sdk/
COPY ./packages/twenty-utils/package.json /app/packages/twenty-utils/
COPY ./packages/twenty-zapier/package.json /app/packages/twenty-zapier/
COPY ./packages/twenty-cli/package.json /app/packages/twenty-cli/
COPY ./packages/create-twenty-app/package.json /app/packages/create-twenty-app/
COPY ./packages/twenty-e2e-testing/package.json /app/packages/twenty-e2e-testing/
COPY ./packages/twenty-front-component-renderer/package.json /app/packages/twenty-front-component-renderer/
COPY ./packages/twenty-oxlint-rules/package.json /app/packages/twenty-oxlint-rules/
COPY ./packages/twenty-companion/package.json /app/packages/twenty-companion/
COPY ./packages/twenty-docs/package.json /app/packages/twenty-docs/
COPY ./packages/twenty-website/package.json /app/packages/twenty-website/
COPY ./packages/twenty-website-new/package.json /app/packages/twenty-website-new/
COPY ./packages/twenty-apps/package.json /app/packages/twenty-apps/

# Install all dependencies
RUN yarn && yarn cache clean && npx nx reset


# Build the backend
FROM common-deps AS twenty-server-build

COPY ./packages/twenty-emails /app/packages/twenty-emails
COPY ./packages/twenty-shared /app/packages/twenty-shared
COPY ./packages/twenty-server /app/packages/twenty-server
COPY ./packages/twenty-client-sdk /app/packages/twenty-client-sdk

RUN npx nx run twenty-server:build
RUN yarn workspaces focus --production twenty-emails twenty-shared twenty-server twenty-client-sdk


# Build the frontend
FROM common-deps AS twenty-front-build

ARG REACT_APP_SERVER_BASE_URL

COPY ./packages/twenty-front /app/packages/twenty-front
COPY ./packages/twenty-ui /app/packages/twenty-ui
COPY ./packages/twenty-shared /app/packages/twenty-shared
COPY ./packages/twenty-sdk /app/packages/twenty-sdk
RUN npx nx build twenty-front


# Final stage: Server
FROM node:24-alpine AS twenty-server

RUN apk add --no-cache curl jq postgresql-client
RUN npm install -g tsx

WORKDIR /app/packages/twenty-server

ARG REACT_APP_SERVER_BASE_URL
ENV REACT_APP_SERVER_BASE_URL=$REACT_APP_SERVER_BASE_URL

# Copy built applications
COPY --chown=1000 --from=twenty-server-build /app /app
COPY --chown=1000 --from=twenty-front-build /app/packages/twenty-front/build /app/packages/twenty-server/dist/front

# Copy entrypoint script
COPY ./packages/twenty-docker/twenty/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

RUN mkdir -p /app/.local-storage /app/packages/twenty-server/.local-storage && \
    chown -R 1000:1000 /app

USER 1000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/main"]
