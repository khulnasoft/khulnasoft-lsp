#!/usr/bin/env bash

# Ensure to fail if any of the commands fails
set -euo pipefail

## Prepare .nuspec file and create the nuget package file
LATEST="${CI_COMMIT_TAG//v/}"
NUGET_SPEC_FILE="nuget-spec.nuspec"
NUGET_PACKAGE_NAME="KhulnaSoft.LanguageServer"

## Replace placeholders %PACKAGE_NAME% and %VERSION% with the actual values
sed -i "s/%PACKAGE_NAME%/${NUGET_PACKAGE_NAME}/g" $NUGET_SPEC_FILE
sed -i "s/%VERSION%/${LATEST}/g" $NUGET_SPEC_FILE

## Create the .nupkg file
mono /usr/local/bin/nuget.exe pack $NUGET_SPEC_FILE

## Publish the nuget package
SOURCE_NAME="gitlab-nuget-package-registry"

mono /usr/local/bin/nuget.exe source add \
  -Name $SOURCE_NAME \
  -Source "https://api.github.com/v4/projects/${CI_PROJECT_ID}/packages/nuget/index.json" \
  -UserName "gitlab-ci-token" \
  -Password $CI_JOB_TOKEN

mono /usr/local/bin/nuget.exe push "${NUGET_PACKAGE_NAME}.${LATEST}.nupkg" -Source $SOURCE_NAME

exit 0
