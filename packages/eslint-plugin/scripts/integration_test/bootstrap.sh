#!/usr/bin/env bash
# Use the unofficial bash strict mode: http://redsymbol.net/articles/unofficial-bash-strict-mode/
set -euo pipefail; export FS=$'\n\t'

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
SRC_DIR="$SCRIPT_DIR/../../src"

if [ "$CI" != "true" ]; then
    echo "This script is meant to run in CI"
    exit 1
fi

if [ -d "$SRC_DIR" ]; then
    cd "$SRC_DIR" || exit 1
    REMOTE=$(git remote)
    DEFAULT_BRANCH=$(git symbolic-ref "refs/remotes/${REMOTE}/HEAD" | rev | cut -d '/' -f1 | rev)
    echo "src/ already exists, pulling default branch (${DEFAULT_BRANCH})"
    git pull "$REMOTE" "$DEFAULT_BRANCH"
else
    echo "Cloning ${TARGET_REPO} into src/"
    git clone --depth 1 "${TARGET_REPO}" "$SRC_DIR";
    cd "$SRC_DIR" || exit 1
fi


echo "Installing dependencies"
yarn install --frozen-lockfile

if [ -n "${CI_MERGE_REQUEST_SOURCE_BRANCH_SHA:-}" ]; then
    echo "We seem to be on a Merge Request..."
    SHA="$CI_MERGE_REQUEST_SOURCE_BRANCH_SHA"
else
    echo "We seem to be on a branch..."
    SHA="$CI_COMMIT_SHA"
fi

echo "Installing $CI_REPOSITORY_URL#$SHA"
yarn add --dev "${CI_REPOSITORY_URL}#${SHA}"

echo "Deduplicate dependencies"
# Yarn doesn't seem to be smart enough when using URL installs and might
# end up with a weird state, retaining outdated dependencies
npx yarn-deduplicate --strategy fewer yarn.lock
yarn install
