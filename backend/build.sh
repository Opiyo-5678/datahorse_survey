#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate

# Create superuser
python manage.py shell << 'EOF'
from django.contrib.auth.models import User
# Delete old admin if exists
User.objects.filter(username='admin').delete()
# Create correct superuser
if not User.objects.filter(username='admin12').exists():
    User.objects.create_superuser('admin12', 'vitalisopiyo84@gmail.com', 'Data@1234')
    print('Superuser admin12 created!')
else:
    print('admin12 already exists.')
EOF