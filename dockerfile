ARG BASE
ARG VERSION

FROM $BASE as build-stage

WORKDIR /app
COPY package*.json /app/
COPY yarn*.lock /app/
COPY .npmrc /app/
RUN npm install yarn@latest -g || true
RUN yarn install --frozen-lockfile
COPY ./ /app/
#run lib tests
RUN yarn package:test --browsers ChromeHeadlessNoSandbox --watch=false
#run package build
RUN yarn package:build

FROM build-stage as publish
ARG VERSION
#publish package with package_version args
RUN yarn config set version-git-tag false
RUN yarn package:publish --non-interactive --new-version $VERSION
