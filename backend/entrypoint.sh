#!/bin/sh
set -e

echo "Attendo il database..."
until python manage.py check --database default >/dev/null 2>&1; do
  sleep 1
done

python manage.py migrate --noinput
python manage.py collectstatic --noinput >/dev/null

if [ "${SEED_DEMO:-0}" = "1" ]; then
  python manage.py seed_demo
fi

# --preload: settings caricati una volta sola, condivisi fra i worker
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 180 --preload --access-logfile -
