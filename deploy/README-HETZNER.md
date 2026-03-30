# Деплой на Hetzner

Этот проект уже собирается как статический сайт, поэтому для MVP нам нужен обычный VPS с `nginx`.

## Что выбрать в Hetzner

- сервер `CX22` или аналогичный
- локация `Helsinki` или `Nuremberg`
- ОС `Ubuntu 24.04`

## Что уже подготовлено в проекте

- готовая сборка в папке `dist`
- конфиг `nginx` в `deploy/nginx/aleshka-story.conf`
- статический SPA-маршрут через `try_files ... /index.html`

## 1. Подключиться к серверу

```bash
ssh root@YOUR_SERVER_IP
```

## 2. Установить nginx

```bash
apt update
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

## 3. Создать папку сайта

```bash
mkdir -p /var/www/aleshka-story
chown -R www-data:www-data /var/www/aleshka-story
```

## 4. Залить содержимое `dist`

С локальной машины:

```powershell
scp -r .\\dist\\* root@YOUR_SERVER_IP:/var/www/aleshka-story/
```

## 5. Подключить nginx-конфиг

Скопируй файл `deploy/nginx/aleshka-story.conf` на сервер:

```powershell
scp .\\deploy\\nginx\\aleshka-story.conf root@YOUR_SERVER_IP:/etc/nginx/sites-available/aleshka-story.conf
```

На сервере:

```bash
ln -s /etc/nginx/sites-available/aleshka-story.conf /etc/nginx/sites-enabled/aleshka-story.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

## 6. Проверить сайт

Открой:

```text
http://YOUR_SERVER_IP
```

## 7. Когда будет домен

После подключения домена можно включить HTTPS через Let's Encrypt:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.ru -d www.your-domain.ru
```

## Обновление сайта

После новой сборки:

```powershell
npm.cmd run build
scp -r .\\dist\\* root@YOUR_SERVER_IP:/var/www/aleshka-story/
```
