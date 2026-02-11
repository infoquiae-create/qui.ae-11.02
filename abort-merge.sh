#!/bin/bash
cd /h/10.02/qui.02
export GIT_EDITOR=true
export GIT_SEQUENCE_EDITOR=true
git merge --abort 2>&1
git reset --hard HEAD 2>&1
git status
