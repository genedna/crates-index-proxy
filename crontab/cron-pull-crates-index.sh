#!/bin/bash

cd /opt/rust/crates.io-index || exit
git fetch
git merge origin/master --no-edit
git prune

exit 0