# Luware.UI.Cache - Angular library project

## Initiate dev environment

- yarn install

## General commands

- yarn package:build - package build
- yarn package:lint - starts linter on the lib project without fix
- yarn package:lint-fix - starts linter on the lib project with fix
- yarn package:test - execute the tests
- yarn package:version X.X.X|MAJOR|MINOR|PATCH - increse the version number
- yarn package:postVersion - commit and push the new version number

## Development mode

- yarn package:debug:publish - builds and set the link up for any dependent application
- yarn package:debug:update - after any changes can call this command will update the references and initiate the hot reload on the dependent application

## Production mode (publish to npm registry)

- yarn package:publish - builds and publish the package to the repository

