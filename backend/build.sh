#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate

# Create superuser automatically if it doesn't exist
python manage.py shell << 'EOF'
from django.contrib.auth.models import User
if not User.objects.filter(username='admin12').exists():
    User.objects.create_superuser('admin12', 'vitalisopiyo84@gmail.com', 'Data@1234')
    print('Superuser created!')
else:
    print('Superuser already exists.')
EOF