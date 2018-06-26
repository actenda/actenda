#!/bin/sh

setup_git() {
  git config --global user.email "travis@travis-ci.org"
  git config --global user.name "Travis CI"
}

commit_website_files() {
  git add dist
  git commit --message "Travis build: $TRAVIS_BUILD_NUMBER"
}

upload_files() {
  git remote set-url origin https://${GH_TOKEN}@github.com/actenda/actenda
  exists=`git show-ref refs/heads/gh-pages`
  if [ -n "$exists" ]; then
      git branch -D gh-pages
  fi
  git push origin `git subtree split --prefix dist master`:gh-pages --force
}

setup_git
commit_website_files
upload_files
