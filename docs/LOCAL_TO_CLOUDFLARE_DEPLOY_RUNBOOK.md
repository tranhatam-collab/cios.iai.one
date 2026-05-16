# LOCAL TO CLOUDFLARE DEPLOY RUNBOOK

CIOS - Local-first delivery flow

Version: v1

---

## 1. Nguyen tac van hanh

Tu nay dev flow chuan la:

1. code tren may local
2. verify local
3. verify smoke script
4. deploy truc tiep len Cloudflare
5. smoke production ngay sau deploy

Khong phu thuoc GitHub Actions de release.

---

## 2. Pre-flight checklist local

Bat buoc truoc moi lan deploy:

```bash
npm run typecheck
npm test
```

Neu co doi DB runtime chinh:

```bash
npm run db:migrate
```

Neu co doi workers flow/runtime:

```bash
npm run smoke:workers:strict
```

---

## 3. Deploy Workers API

```bash
cd services/api
CLOUDFLARE_ACCOUNT_ID=<account_id> npm run deploy
```

Sau deploy, kiem tra nhanh:

```bash
curl -sS "https://cios-workers-api.tranhatam66.workers.dev/v1/system/health"
```

---

## 4. Deploy Pages

```bash
cd /path/to/cios.iai.one
CLOUDFLARE_ACCOUNT_ID=<account_id> npm run deploy:pages
```

---

## 5. Smoke production bat buoc

```bash
npm run smoke:workers:strict
```

Pass moi duoc coi la deploy thanh cong.

---

## 6. Thu tu thao tac chuan

```bash
npm run typecheck
npm test
npm run db:migrate
npm run smoke:workers:strict
cd services/api && CLOUDFLARE_ACCOUNT_ID=<account_id> npm run deploy
cd ..
CLOUDFLARE_ACCOUNT_ID=<account_id> npm run deploy:pages
npm run smoke:workers:strict
```

---

## 7. Neu fail

- Fail local verify: khong deploy
- Fail smoke truoc deploy: khong deploy
- Fail smoke sau deploy: rollback ngay theo `docs/DEPLOY_AND_SMOKE_RUNBOOK.md`

---

## 8. Definition of done moi lan release

- typecheck pass
- test pass
- migration pass neu co doi schema
- workers deploy pass
- pages deploy pass
- smoke strict pass sau deploy
