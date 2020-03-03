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
#publish package with package_version args
RUN yarn package:publish --newVersion $VERSION
