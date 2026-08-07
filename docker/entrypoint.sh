#!/bin/sh
set -eu

BACKEND_URL=${BACKEND_URL:-http://server:8080}

if [ -f /etc/nginx/conf.d/default.conf.template ]; then
  sed "s|__BACKEND_URL__|${BACKEND_URL}|g" /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
fi

exec nginx -g 'daemon off;'
