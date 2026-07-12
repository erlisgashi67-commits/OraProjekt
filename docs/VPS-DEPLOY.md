# VPS Deployment Guide

> Për deployment në VPS (DigitalOcean, Hetzner, Linode) me Docker + Caddy

---

## Pse VPS?

| Avantazh | Vlera |
|----------|-------|
| Kontroll i plotë | Root access |
| Kosto e ulët | $5-10/muaj |
| Ska vendor lock-in | Lëviz kurdo |
| SQLite funksionon | Nuk ka serverless limit |
| Privacy | Të dhënat te ti |

---

## Hapi 1: Blej VPS

### Rekomandime:

| Provider | Spec | Çmimi | Link |
|----------|------|-------|------|
| **Hetzner** | 2 vCPU, 4GB RAM | €4.5/muaj | https://hetzner.com |
| **DigitalOcean** | 1 vCPU, 2GB RAM | $12/muaj | https://digitalocean.com |
| **Linode** | 1 vCPU, 2GB RAM | $12/muaj | https://linode.com |
| **Vultr** | 1 vCPU, 2GB RAM | $12/muaj | https://vultr.com |

**Rekomandimi:** Hetzner CPX21 (4GB RAM, €4.5/muaj) — më i lirë, Europa

### OS: Ubuntu 22.04 LTS

---

## Hapi 2: Setup Server të Parë

```bash
# SSH në server (replace me IP tënde)
ssh root@YOUR_SERVER_IP

# Update system
apt update && apt upgrade -y

# Instalo Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalo Docker Compose
apt install docker-compose -y

# Instalo Bun (për scripts)
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Instalo PM2 (opsionale, për non-Docker)
npm install -g pm2

# Krijo user jo-root (security)
adduser oraprojekt
usermod -aG sudo oraprojekt
usermod -aG docker oraprojekt

# Switch te user i ri
su - oraprojekt
```

---

## Hapi 3: Setup Firewall

```bash
# Lejo vetëm portet e nevojshme
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable
sudo ufw status
```

---

## Hapi 4: Clone + Configure

```bash
# Si user oraprojekt
cd ~
git clone https://github.com/erlisgashi67-commits/OraProjekt.git
cd OraProjekt

# Instalo dependencies
bun install

# Setup environment
cp .env.example .env
nano .env
# Edit:
#   DATABASE_URL=file:./db/custom.db
#   AUTH_SECRET=$(openssl rand -base64 32)
#   GOOGLE_CLIENT_ID=...
#   GOOGLE_CLIENT_SECRET=...
#   AUTH_URL=https://oraprojekt.com
```

---

## Hapi 5: Build + Database

```bash
# Build Next.js
bun run build

# Setup database
bun run db:push
bun run db:generate
bun run scripts/seed.ts  # opsionale
```

---

## Hapi 6: Run me PM2 (opsioni më i thjeshtë)

```bash
# Start me PM2
pm2 start "bun run start" --name oraprojekt

# Save process list (auto-start në reboot)
pm2 save
pm2 startup
# Ekzekuto komandën që shfaqet

# Verifiko
pm2 status
curl http://localhost:3000
```

---

## Hapi 7: Setup Caddy (HTTPS automatik)

```bash
# Instalo Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy -y
```

### Konfiguro Caddyfile

```bash
sudo nano /etc/caddy/Caddyfile
```

Ngjit këtë (replace `oraprojekt.com` me domain-in tënd):

```
oraprojekt.com {
    reverse_proxy localhost:3000
    
    encode gzip zstd
    
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-XSS-Protection "1; mode=block"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }
    
    @static {
        path /_next/static/* /favicon.ico /logo.png /manifest.webmanifest
    }
    header @static Cache-Control "public, max-age=31536000, immutable"
    
    log {
        output file /var/log/caddy/oraprojekt.log
        format json
    }
}

www.oraprojekt.com {
    redir https://oraprojekt.com{uri} permanent
}
```

### Start Caddy

```bash
sudo systemctl restart caddy
sudo systemctl enable caddy
sudo systemctl status caddy
```

Caddy do të marrë automatikisht SSL certificate nga Let's Encrypt.

---

## Hapi 8: DNS Configuration

Te regjistri i domain-it (Namecheap, Cloudflare, etj.):

```
Type: A
Host: @
Value: YOUR_SERVER_IP
TTL: 300

Type: A
Host: www
Value: YOUR_SERVER_IP
TTL: 300
```

Verifiko:
```bash
dig oraprojekt.com
# Duhet të tregojë IP të serverit
```

---

## Hapi 9: Opsioni me Docker Compose (rekomanduar)

### docker-compose.yml

Krijuar tashmë në repo. Update me domain tënd:

```yaml
# docker-compose.yml (tashmë ekziston)
# Update Caddyfile me domain tënd
```

### Run

```bash
# Build + start
docker-compose up -d

# Shiko logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild pas code change
docker-compose up -d --build
```

---

## Hapi 10: Setup SSL Certificate (nëse përdor Docker Caddy)

Caddy në Docker merr SSL automatikisht. Verifiko:

```bash
curl -vI https://oraprojekt.com 2>&1 | grep -i "ssl\|cert"
# Duhet të shohësh TLS connection
```

---

## Hapi 11: Backup Automation

```bash
# Krijo script backup
nano ~/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/oraprojekt/backups"
DB_FILE="/home/oraprojekt/OraProjekt/db/custom.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
cp $DB_FILE $BACKUP_DIR/db_$DATE.db

# Fshi backups më të vjetër se 30 ditë
find $BACKUP_DIR -name "db_*.db" -mtime +30 -delete

echo "Backup complete: db_$DATE.db"
```

```bash
chmod +x ~/backup.sh

# Schedule ditor në 2 AM
crontab -e
# Shto:
0 2 * * * /home/oraprojekt/backup.sh >> /home/oraprojekt/backups/backup.log 2>&1
```

---

## Hapi 12: Monitoring

### PM2 Monitoring
```bash
pm2 monit         # real-time
pm2 logs          # logs
pm2 status        # status
```

### System Monitoring
```bash
# Instalo htop
sudo apt install htop -y
htop

# Disk usage
df -h

# Memory
free -h

# Network
iftop
```

### Log Rotation
```bash
# PM2 logs rriten pa kufi — konfiguro rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## Hapi 13: Update App

```bash
cd ~/OraProjekt

# Pull latest code
git pull origin main

# Install dependencies (nëse ndryshuan)
bun install

# Build
bun run build

# Generate Prisma client (nëse schema ndryshoi)
bun run db:generate
bun run db:push

# Restart PM2
pm2 restart oraprojekt

# Ose me Docker:
docker-compose up -d --build
```

---

## Hapi 14: Security Hardening

### SSH Key Auth (disable password)
```bash
# Në lokal (machine juaj):
ssh-copy-id oraprojekt@YOUR_SERVER_IP

# Në server:
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

### Fail2ban (anti-brute force)
```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Automatic Security Updates
```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## Troubleshooting

### Site nuk hapet
```bash
# Kontrollo PM2
pm2 status

# Kontrollo port 3000
ss -tlnp | grep 3000

# Kontrollo Caddy
sudo systemctl status caddy
sudo journalctl -u caddy --no-pager | tail -20

# Kontrollo logs
pm2 logs oraprojekt --lines 50
```

### 502 Bad Gateway
```bash
# Next.js ka crash
pm2 restart oraprojekt

# Kontrollo memory
free -h
# Nëse full → upgrade VPS ose swap file
```

### SSL nuk funksionon
```bash
# Kontrollo Caddy logs
sudo journalctl -u caddy | grep -i "error\|cert"

# DNS duhet të jetë propaguar
dig oraprojekt.com

# Manual cert renewal (nuk duhet të nevojitet)
sudo systemctl restart caddy
```

### Database locked
```bash
# SQLite me users konkurrentë → konsidero PostgreSQL
# Ose shto busy_timeout në Prisma schema
```

---

## Cost Summary

| Item | Mujor | Vjetor |
|------|--------|--------|
| Hetzner VPS (4GB) | €4.5 | €54 |
| Domain | — | $12 |
| Backup storage (S3) | $0.5 | $6 |
| Email (Resend) | $0 (free) | $0 |
| **Total** | **~€5** | **~€72** |

---

## Quick Reference

```bash
# SSH
ssh oraprojekt@YOUR_SERVER_IP

# PM2
pm2 status
pm2 restart oraprojekt
pm2 logs oraprojekt

# Docker
docker-compose up -d
docker-compose down
docker-compose logs -f

# Caddy
sudo systemctl restart caddy
sudo systemctl status caddy

# Update app
cd ~/OraProjekt && git pull && bun install && bun run build && pm2 restart oraprojekt

# Backup
~/backup.sh
```
