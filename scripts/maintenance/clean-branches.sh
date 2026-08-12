#!/bin/bash
# Description: This script fetches the latest remote state and provides a safe way
# to delete old `copilot/*`, `claude/*`, and `originaladmin/*` branches.

echo "Fetching pruned remote state..."
git fetch -p

echo "The following remote branches matching copilot/, claude/, or originaladmin/ were found:"
git branch -r | grep -E "origin/copilot|origin/claude|origin/originaladmin|originaladmin/fork|originaladmin/origin"

read -p "Do you want to delete all these branches from the origin remote? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "Deleting branches..."
    for branch in $(git branch -r | grep -E "origin/copilot|origin/claude" | sed 's/origin\///'); do
        git push origin --delete "$branch"
    done
    echo "Done! Run 'git branch -a' to verify."
else
    echo "Aborted."
fi
