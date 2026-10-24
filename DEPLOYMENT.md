# نشر التطبيق (Docker → Docker Hub → السيرفر)

## كيف مركّب الـ Docker

| الملف | وظيفته |
|---|---|
| `docker-compose.yml` | تعريف الإنتاج: 5 خدمات (`db` = SQL Server، `api` = ASP.NET، `bot` = بوت الواتساب، `web` = nginx + React، `caddy` = HTTPS). يسحب الصور من Docker Hub. **هذا الملف الوحيد اللي ينرفع للسيرفر.** |
| `docker-compose.override.yml` | للجهاز المحلي فقط: يضيف خطوات الـ build، ويفتح `web` على `http://localhost`، ويطفّي `caddy`. Docker Compose يدمجه تلقائياً لو موجود جنب الملف الأول. |
| `.env` | الأسرار والإعدادات (مو في git). انسخه من `.env.example`. |
| `backend/.../Dockerfile` | يبني الـ API. |
| `client/Dockerfile` + `client/nginx.conf` | يبني الواجهة، و nginx يقدّمها ويحوّل `/api/*` للـ API و `/webhook` للبوت. |
| `whatsapp-bot/Dockerfile` | يبني بوت الواتساب (Python). |

على السيرفر المتصفح يتكلم مع Caddy فقط (80 و 443). Caddy يفك التشفير ويحوّل لـ nginx. الـ API وقاعدة البيانات ما لهم بورت مفتوح للإنترنت.

```
المتصفح ──HTTPS──► caddy (:443) ──► web (nginx :80) ──/api/*──► api (:8080) ──► db (SQL Server :1433)
واتساب (Meta) ──HTTPS──► caddy ──► web ──/webhook──► bot (:8000) ──/api/*──► api
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
   docker compose push api web bot
   ```

بيطلع عندك في Docker Hub ثلاث مستودعات: `<user>/marketplace-api` و `<user>/marketplace-web` و `<user>/marketplace-bot`.

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
nano .env      # الصق القيم + DOCKERHUB_USER و IMAGE_TAG و DOMAIN (شوف القسم 4)
```

**قبل التشغيل** جهّز الدومين (القسم 4)، وبعدين شغّل:

```bash
docker compose pull
docker compose up -d
docker compose ps
```

الموقع الحين على `https://DOMAIN`.

**الجدار الناري:** افتح بس 22 (SSH) و 80 و 443. في **Azure** هذا من الـ NSG (VM ← Networking ← Inbound port rule)، ولا تحتاج `ufw`. في باقي الشركات:

```bash
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable
```

## 4) دومين + HTTPS

خدمة `caddy` تطلب شهادة مجانية من Let's Encrypt للدومين اللي في `DOMAIN`، وتجددها تلقائياً، وتحوّل `http://` لـ `https://`. الشهادة تنحفظ في volume اسمه `caddy-data`.

1. **الدومين:**
   - **مجاني على Azure:** Public IP ← Configuration ← **DNS name label** (مثلاً `khalid-market`)، والدومين يصير `khalid-market.<region>.cloudapp.azure.com`.
   - **أو دومين خاص:** من مزوّد الدومين سوّ سجل **A** يشير لـ `SERVER_IP`.
2. تأكد إنه يرجّع IP السيرفر **قبل** ما تشغّل (لو Caddy حاول والدومين مو جاهز، Let's Encrypt يحدّ المحاولات الفاشلة):
   ```bash
   nslookup <الدومين>
   ```
3. في `.env` على السيرفر: `DOMAIN=<الدومين>`.
4. `docker compose up -d`، وتابع `docker compose logs -f caddy` لين يطلع `certificate obtained successfully`.

> لا تشغّل `docker compose down -v` على السيرفر: يمسح الشهادة (وقاعدة البيانات). Let's Encrypt يسمح بعدد محدود من الشهادات لنفس الدومين بالأسبوع.

## 5) تحديث نسخة جديدة

على جهازك:

```bash
# غيّر IMAGE_TAG=v1.0.1 في .env
docker compose build
docker compose push api web bot
```

على السيرفر:

```bash
# غيّر IMAGE_TAG=v1.0.1 في .env
docker compose pull
docker compose up -d
```

الـ migrations تنطبق تلقائياً لما يشتغل الـ API. **الرجوع لنسخة قديمة:** ارجع `IMAGE_TAG` للقيمة السابقة وشغّل نفس الأمرين.

### إضافة أدمن جديد

على السيرفر في `.env`: حط كلمة السر في `SEED_PASSWORD` والإيميل في `ADMIN_EMAIL`، وبعدها أعد تشغيل الـ API:

```bash
sudo docker compose up -d --no-deps api
```

الحساب ينسوي مرة وحدة بس (إذا الإيميل مو موجود)، وتطلع في `docker compose logs api` رسالة `Admin account created`. تغيير `SEED_PASSWORD` ما يغيّر كلمات سر الحسابات الموجودة.

## 6) نسخ احتياطي لقاعدة البيانات

```bash
docker compose exec db bash -c '/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" \
  -Q "BACKUP DATABASE MarketplaceDB TO DISK = N'\''/var/opt/mssql/backup.bak'\'' WITH INIT"'
docker compose cp db:/var/opt/mssql/backup.bak ./backup-$(date +%F).bak
```

انسخ الملف لمكان برّا السيرفر بشكل دوري.

## 7) بوت الواتساب

البوت يستقبل رسائل العملاء من Meta، والـ AI يدوّر على المنتجات ويعبّي السلة ويسوي الطلب عن طريق الـ API نفسه (الدفع عند الاستلام). الطلبات تطلع في لوحة الأدمن مثل طلبات الموقع.

1. في `.env` على السيرفر عبّي: `BOT_KEY` (`openssl rand -hex 32`)، و `WHATSAPP_TOKEN` و `PHONE_NUMBER_ID` (من Meta ← WhatsApp ← API Setup)، و `OPENAI_API_KEY`.
2. `docker compose up -d` وتأكد إن `https://DOMAIN/webhook?hub.mode=subscribe&hub.challenge=123` يرجّع `123`.
3. في Meta ← WhatsApp ← Configuration ← Webhook: الـ Callback URL هو `https://DOMAIN/webhook` (أي Verify token يمشي)، واشترك في `messages`.

لوق البوت: `docker compose logs -f bot`.

**الموجز اليومي (اختياري):** `whatsapp-bot/digest.py` يجهّز لرقم `DIGEST_TO` أخبار التقنية المناسبة له (حسب `DIGEST_PROFILE`) وفرص التدريب والوظائف في عُمان. الساعة 8 يرسل قالب `daily_digest_ready` (لازم يكون معتمد في Meta، ونصّه `TEMPLATE_TEXT` داخل الملف) فيه زر "أرسل الموجز"، ولما يضغطه يوصله الموجز الكامل. ويقدر يكتب "موجز" أي وقت. يحتاج مهمة cron على السيرفر (الساعة 4:00 UTC = 8:00 بتوقيت عُمان):

```bash
echo '0 4 * * * root cd /home/azureuser/marketplace && docker compose exec -T bot python digest.py >> digest.log 2>&1' | sudo tee /etc/cron.d/marketplace-digest
```

## ملاحظات

- **ما تـ commit ملف `.env` أبداً.** هو أصلاً في `.gitignore`.
- **الإيميلات:** حط `SMTP_USERNAME` (إيميل Gmail) و `SMTP_PASSWORD` ([App Password](https://myaccount.google.com/apppasswords)) في `.env`. لو تركتهم فاضيين، التطبيق يشتغل عادي بس ما يرسل إيميلات.
- **Swagger** يشتغل في التطوير بس (`dotnet run`)، وفي الإنتاج مقفول.
