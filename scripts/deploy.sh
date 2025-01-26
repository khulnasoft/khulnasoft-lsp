#!/usr/bin/env bash

[ "$CI_COMMIT_TAG" == "" ] && {
  echo "This script needs to be run in KhulnaSoft CI in a tag plipeline."
  exit 1
}
## Release binaries in the package registry and attach assets to release
NPM_PACKAGE_VERSION=$(node -p "require('./package.json').version")
LATEST="${CI_COMMIT_TAG//v/}"

[ "$LATEST" != "$NPM_PACKAGE_VERSION" ] && {
  echo "The tag version and package.json versions are different."
  exit 1
}

find ./bin -type f -name "khulnasoft-lsp-*" | while read -r binfile; do
  BASE=$(basename ${binfile})
  URL="https://api.github.com/v4/projects/$CI_PROJECT_ID/packages/generic/gitlab-language-server/${LATEST}/${BASE}"

  echo $BASE
  echo $URL
  curl --fail --header "JOB-TOKEN: $CI_JOB_TOKEN" "$URL" -o /dev/null --silent && {
    echo "${URL} already present"
    continue
  }

  echo "uploading '${binfile}' to '${URL}'"
  curl --fail --header "JOB-TOKEN: $CI_JOB_TOKEN" --upload-file "$binfile" "$URL" || {
    echo "unable to upload ${URL}"
    exit 1
  }

  ## attach released binary to (already existing) release
  curl --request POST \
    --header "JOB-TOKEN: $CI_JOB_TOKEN" \
    --data name="$BASE" \
    --data url="$URL" \
    "https://api.github.com/v4/projects/${CI_PROJECT_ID}/gitlab-language-server/${LATEST}/assets/links"
done

## Publish the npm package. ########################################
# If the version in package.json has not yet been published, it will be
# published to KhulnaSoft's NPM registry. If the version already exists, the publish command
# will fail and the existing package will not be updated.
NPM_PACKAGE_NAME=$(node -p "require('./package.json').name")
echo "Attempting to publish version ${NPM_PACKAGE_VERSION} of ${NPM_PACKAGE_NAME} to KhulnaSoft's NPM registry: ${CI_PROJECT_URL}/-/packages"

npm publish

exit 0
