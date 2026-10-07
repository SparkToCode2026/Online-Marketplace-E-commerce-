# نشر التطبيق (Docker → Docker Hub → السيرفر)

## كيف مركّب الـ Docker

| الملف | وظيفته |
|---|---|
| `docker-compose.yml` | تعريف الإنتاج: 3 خدمات (`db` = SQL Server، `api` = ASP.NET، `web` = nginx + React). يسحب الصور من Docker Hub. **هذا الملف الوحيد اللي ينرفع للسيرفر.** |
| `docker-compose.override.yml` | للجهاز المحلي فقط: يضيف خطوات الـ build. Docker Compose يدمجه تلقائياً لو موجود جنب الملف الأول. |
| `.env` | الأسرار والإعدادات (مو في git). انسخه من `.env.example`. |
| `backend/.../Dockerfile` | يبني الـ API. |
| `client/Dockerfile` + `client/nginx.conf` | يبني الواجهة، و nginx يقدّمها ويحوّل `/api/*` للـ API. |

المتصفح يتكلم مع nginx فقط (بورت 80). الـ API وقاعدة البيانات ما لهم بورت مفتوح للإنترنت.

```
المتصفح ──► web (nginx :80) ──/api/*──► api (:8080) ──► db (SQL Server :1433)
```

## 1) تجربة محلية

```bash
cp .env.example .env        # وعبّي القيم
docker compose up -d --build
```

افتح http://localhost. سجّل الدخول بأي حساب تجريبي، وكلمة السر هي قيمة `SEED_PASSWORD` من `.env`.

> `SEED_PASSWORD` تنطبق **أول مرة بس** (لما تكون القاعدة فاضية). تغييرها بعدين ما يغيّر الحسابات الموجودة.

أوامر مفيدة:

```bash
docker compose ps              # حالة الخدمات
docker compose logs -f api     # لوق الـ API
docker compose down            # إيقاف (البيانات تبقى في volume)
docker compose down -v         # إيقاف + مسح قاعدة البيانات بالكامل
```

## 2) الرفع على Docker Hub

1. سوّ حساب على https://hub.docker.com.
2. من **Account settings → Personal access tokens** سوّ توكن بصلاحية Read & Write.
3. سجّل دخول من جهازك (اسم المستخدم، وبعدين الصق التوكن بدل كلمة السر):
   ```bash
   docker login -u <اسم-المستخدم>
   ```
4. في `.env` عدّل:
   ```
   DOCKERHUB_USER=<اسم-المستخدم>
   IMAGE_TAG=v1.0.0
   ```
5. ابنِ وارفع:
   ```bash
   docker compose build
   docker compose push api web
   ```

بيطلع عندك في Docker Hub مستودعين: `<user>/marketplace-api` و `<user>/marketplace-web`.

> الصور ما فيها أي أسرار، لأن كل الأسرار تجي من `.env` وقت التشغيل، فعادي تكون Public. لو خليتها Private، لازم تسوي `docker login` على السيرفر بعد.

## 3) النشر على السيرفر

**المتطلبات:** سيرفر Linux (Ubuntu مثلاً) بمعالج **x86_64 / amd64**، و**4GB رام** (أقل شي 2GB). صورة SQL Server ما تشتغل على ARM. أمثلة: DigitalOcean، Hetzner، AWS Lightsail، Azure VM.

```bash
# على السيرفر: ثبّت Docker
curl -fsSL https://get.docker.com | sh

mkdir -p ~/marketplace && cd ~/marketplace
```

من جهازك انسخ **ملفين بس** (مو ملف الـ override):

```bash
scp docker-compose.yml .env.example user@SERVER_IP:~/marketplace/
```

على السيرفر سوّ `.env` بأسرار **جديدة** تختلف عن اللي في جهازك:

```bash
cp .env.example .env
echo "MSSQL_SA_PASSWORD=Sa_$(openssl rand -hex 16)X"
echo "JWT_KEY=$(openssl rand -hex 32)"
echo "SEED_PASSWORD=Seed_$(openssl rand -hex 8)Q"
nano .env      # الصق القيم + DOCKERHUB_USER و IMAGE_TAG
```

شغّل:

```bash
docker compose pull
docker compose up -d
docker compose ps
```

الموقع الحين على `http://SERVER_IP`.

**الجدار الناري:** افتح بس 22 (SSH) و 80 و 443:

```bash
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable
```

## 4) دومين + HTTPS (الخطوة التالية)

1. من مزوّد الدومين سوّ سجل **A** يشير لـ `SERVER_IP`.
2. أسهل طريقة للشهادة هي **Caddy**: يطلع شهادة Let's Encrypt ويجددها تلقائياً. في `docker-compose.yml` على السيرفر:
   - شيل `ports` من خدمة `web`.
   - أضف هذي الخدمة:
     ```yaml
       caddy:
         image: caddy:2
         command: caddy reverse-proxy --from shop.example.com --to web:80
         ports:
           - "80:80"
           - "443:443"
         volumes:
           - caddy-data:/data
         restart: unless-stopped
     ```
   - وتحت `volumes:` أضف `caddy-data:`.
3. شغّل `docker compose up -d`، وبعدين افتح `https://shop.example.com`.

(البديل: Cloudflare proxy قدّام السيرفر.)

## 5) تحديث نسخة جديدة

على جهازك:

```bash
# غيّر IMAGE_TAG=v1.0.1 في .env
docker compose build
docker compose push api web
```

على السيرفر:

```bash
# غيّر IMAGE_TAG=v1.0.1 في .env
docker compose pull
docker compose up -d
```

الـ migrations تنطبق تلقائياً لما يشتغل الـ API. **الرجوع لنسخة قديمة:** ارجع `IMAGE_TAG` للقيمة السابقة وشغّل نفس الأمرين.

## 6) نسخ احتياطي لقاعدة البيانات

```bash
docker compose exec db bash -c '/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" \
  -Q "BACKUP DATABASE MarketplaceDB TO DISK = N'\''/var/opt/mssql/backup.bak'\'' WITH INIT"'
docker compose cp db:/var/opt/mssql/backup.bak ./backup-$(date +%F).bak
```

انسخ الملف لمكان برّا السيرفر بشكل دوري.

## ملاحظات

- **ما تـ commit ملف `.env` أبداً.** هو أصلاً في `.gitignore`.
- **الإيميلات:** حط `SMTP_USERNAME` (إيميل Gmail) و `SMTP_PASSWORD` ([App Password](https://myaccount.google.com/apppasswords)) في `.env`. لو تركتهم فاضيين، التطبيق يشتغل عادي بس ما يرسل إيميلات.
- **Swagger** يشتغل في التطوير بس (`dotnet run`)، وفي الإنتاج مقفول.
