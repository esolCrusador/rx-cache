FROM nimbus.azurecr.io/ui-build:latest as build-stage

WORKDIR /app
COPY package*.json /app/
COPY yarn*.lock /app/
COPY .npmrc /app/
RUN npm install yarn@latest -g || true
RUN yarn install --frozen-lockfile
COPY ./ /app/
RUN yarn package:test --browsers ChromeHeadlessNoSandbox --watch=false
RUN yarn package:build

FROM build-stage as publish
RUN yarn package:publish