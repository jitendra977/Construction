# 🗄️ डेटाबेस ब्याकअप / रिस्टोर गाइड
## ConstructPro — Database Export/Import System

---

## 📌 के छ यो सिस्टममा?

यो सिस्टमले तपाईंलाई PostgreSQL डेटाबेसको:
- **ब्याकअप** लिन (Export)
- **रिस्टोर** गर्न (Import)
- **सर्भरबाट डाउनलोड** गर्न
- **सर्भरमा अपलोड** गर्न

सजिलैसँग एउटा command मात्रले गर्न मिल्छ।

---

## ⚡ सबै Database Commands

| Command | के गर्छ |
|---------|---------|
| `make db-backup` | Local Docker DB को ब्याकअप लिन्छ (`.sql.gz` फाइलमा) |
| `make db-restore FILE=...` | Local Docker DB मा ब्याकअप फाइलबाट रिस्टोर गर्छ |
| `make db-export` | Plain `.sql` फाइलमा Export गर्छ (पढ्न मिल्ने) |
| `make db-import FILE=...` | Plain `.sql` फाइलबाट Import गर्छ |
| `make db-pull` | **Server (VPS) बाट** DB Download गर्छ → local मा |
| `make db-push FILE=...` | **Local ब्याकअप** Server मा Upload गरी Restore गर्छ |
| `make db-list` | `./backups/` फोल्डरका सबै ब्याकअप फाइल देखाउँछ |
| `make db-prune` | ७ दिन पुरानो ब्याकअप फाइल मेट्छ |

---

## 📖 Step-by-Step उपयोग निर्देशिका

---

### 1️⃣ Local ब्याकअप लिन (Export)

```bash
make db-backup
```

**के हुन्छ:**
- `./backups/` फोल्डर बन्छ (नभएको भए)
- `backups/db_20260501_160000.sql.gz` जस्तो नाममा ब्याकअप सुरक्षित हुन्छ
- Compressed (gzip) फाइल हो — साइज सानो हुन्छ

---

### 2️⃣ Local मा रिस्टोर गर्न (Import)

```bash
# पहिले backup files list हेर्नुस्
make db-list

# त्यसपछि रिस्टोर गर्नुस्
make db-restore FILE=backups/db_20260501_160000.sql.gz
```

> ⚠️ **सावधान:** यो command चलाउँदा पुरानो database मेटिन्छ।  
> Command चलाएपछि **३ सेकेन्ड** को मौका छ — रोक्न `Ctrl+C` थिच्नुस्।

---

### 3️⃣ Plain SQL Export (पढ्न सकिने)

```bash
make db-export
```

- `backups/export_20260501_160000.sql` नामको फाइल बन्छ
- यो फाइल text editor मा खोल्न मिल्छ
- अर्को कुनै server वा MySQL/PostgreSQL मा import गर्न पनि सजिलो

---

### 4️⃣ Plain SQL Import

```bash
make db-import FILE=backups/export_20260501_160000.sql
```

---

### 5️⃣ Server (VPS) बाट DB Download गर्न

```bash
make db-pull
```

**के हुन्छ:**
- VPS (nishanaweb.cloud) मा SSH गरी database dump निकाल्छ
- तपाईंको local `./backups/db_server_TIMESTAMP.sql.gz` मा Download हुन्छ

**यो कहिले काम लाग्छ:**
- Production data local मा test गर्नुपर्दा
- Server को data backup local मा राख्नुपर्दा
- Server migrate गर्नुपर्दा

---

### 6️⃣ Local Backup Server मा Push गर्न

```bash
make db-push FILE=backups/db_20260501_160000.sql.gz
```

> ⚠️ **धेरै सावधान हुनुस्!** यो PRODUCTION database मा असर गर्छ।  
> Command चलाएपछि **५ सेकेन्ड** को मौका छ — रोक्न `Ctrl+C` थिच्नुस्।

**यो कहिले काम लाग्छ:**
- Local मा बनाएको data server मा चढाउनुपर्दा
- Server crash भएपछि local backup बाट restore गर्नुपर्दा

---

### 7️⃣ ब्याकअप List हेर्न

```bash
make db-list
```

Output:
```
  Local Backups (./backups/)
  -rw-r--r-- 1 user  4.2M  May 1 16:00 backups/db_20260501_160000.sql.gz
  -rw-r--r-- 1 user  3.8M  Apr 30 09:00 backups/db_20260430_090000.sql.gz
```

---

### 8️⃣ पुरानो ब्याकअप मेट्न

```bash
make db-prune
```

७ दिनभन्दा पुरानो सबै `.sql` र `.sql.gz` फाइल मेटिन्छ।

---

## 🔄 सामान्य Workflow (Daily Use)

### Deploy गर्नु अघि ब्याकअप लिनुस्:
```bash
make db-pull       # Server बाट latest data download
make server-deploy # Deploy गर्नुस्
```

### Server crash भए:
```bash
make db-list                                        # कुन backup छ हेर्नुस्
make db-push FILE=backups/db_server_LATEST.sql.gz   # Restore गर्नुस्
```

### Local मा test गर्नुस्:
```bash
make db-pull                                         # Server data download
make db-restore FILE=backups/db_server_XXXX.sql.gz  # Local मा load
make local                                           # Test गर्नुस्
```

---

## 📁 Backup Files को नाम बुझ्ने तरिका

```
db_20260501_160250.sql.gz
│   │         │
│   │         └── समय (16:02:50 = 4:02 PM)
│   └──────────── मिति (2026 May 01)
└──────────────── "db" = database backup

db_server_20260501_160250.sql.gz
└── "server" = VPS बाट download गरिएको
```

---

## ❗ गल्ती भए के गर्ने?

**"docker compose not running" error:**
```bash
make up        # Docker start गर्नुस्, अनि फेरि try गर्नुस्
```

**"SSH connection failed" error:**
```bash
ssh nishanaweb@nishanaweb.cloud   # SSH directly test गर्नुस्
```

**"File not found" error:**
```bash
make db-list   # उपलब्ध files हेर्नुस् र सही नाम copy गर्नुस्
```

---

## 💡 राम्रो अभ्यास (Best Practices)

1. **हरेक Deploy अघि** `make db-pull` चलाउनुस् — server data safe राख्न
2. **हप्ताको एकपटक** `make db-prune` चलाउनुस् — disk space बचाउन
3. **ब्याकअप फाइलहरू** Google Drive वा external disk मा पनि राख्नुस्
4. **Production मा** `db-push` र `db-restore` अति सावधानीसाथ मात्र चलाउनुस्
