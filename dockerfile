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
RUN git config --global user.email "build@luware.com"
RUN git config --global user.name "Build Server"
RUN yarn package:version --new-version $VERSION
RUN yarn package:build
RUN yarn package:publish --non-interactive
