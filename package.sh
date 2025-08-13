#!/bin/bash

# This script packages the GNOME Shell extension into a zip file,
# which is the format required for uploading to extensions.gnome.org.
#
# It automatically names the zip file based on the 'uuid' in metadata.json
# and excludes development files and directories that are not needed at runtime.

# Exit immediately if a command exits with a non-zero status.
set -e

# Check if jq is installed, as it's used to parse metadata.json
if ! command -v jq &> /dev/null; then
    echo "Error: 'jq' is not installed. Please install it to continue." >&2
    echo "For example, on Debian/Ubuntu: sudo apt-get install jq" >&2
    exit 1
fi

# Read the UUID from metadata.json
UUID=$(jq -r .uuid metadata.json)
UUID_PROD="avatar@pawel.swiszcz.com"
if [ -z "$UUID" ]; then
    echo "Error: Could not read 'uuid' from metadata.json." >&2
    exit 1
fi

ZIP_FILE="${UUID_PROD}.zip"

rm "${ZIP_FILE}"

echo "Packaging extension into ${ZIP_FILE}..."

zip -r "${ZIP_FILE}" . -x "assets/*" -x ".git/*" -x ".gitignore" -x ".project" -x "README.md" -x "Changelog.md" -x "package.sh" -x "*.zip"

echo "Successfully created ${ZIP_FILE}"
