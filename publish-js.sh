#!/bin/sh

# The way packages in this repo are built, the `dist` folder contains the actual
# publishable artifact, including a transformed package.json.  So we do this
# trick to replace all the packages in `packages` with the `dist` directories
# instead before publishing.
for package in packages/*/package.json
do
  packagePath=${package//\/package.json}
  mv "${packagePath}" "${packagePath}-old"
  mv "${packagePath}-old/dist" "${packagePath}"
  rm -rf "${packagePath}-old"
done

pnpm exec changeset publish
