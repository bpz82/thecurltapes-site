# thecurltapes.com (GitHub Pages)

The custom domain is served from the public repository
[bpz82/thecurltapes-site](https://github.com/bpz82/thecurltapes-site).
GitHub Pages is enabled on branch `main`, at the repository root, with
custom domain `thecurltapes.com`. The rebuild source on the box is
`/workspace/thecurltapes-site/` (the live site files are in `public/`).

This file is the tried-once note for going live and for rolling DNS back
to the current Squarespace records. Do not delete previous deploys or
this rebuild. Do not put secrets in the GitHub repository or in client
code. GitHub Pages serves the static pages. Contact, newsletter, and
order forms POST to the Netlify functions at
`https://thecurltapes.netlify.app/api/contact`, `/api/order`, and
`/api/subscribe` (see `public/assets/js/config.js`). If a request
fails, the page falls back to "email us at thecurltapes@gmail.com"
links. DNS changes are done separately; do not change DNS from a
pages-only publish.

## First go-live (repo already set up; DNS not changed yet)

The first source published to the repo is the Nov 12, 2026 rebuild in
`public/`, whose `index.html` md5 is `7338e464115dc0b68b260ba59dbc31dd`.
The repo has a `CNAME` file containing exactly `thecurltapes.com` and an
empty `.nojekyll`.

DNS is changed in Namecheap (or at the current Squarespace/NS1
nameservers), not in this file. **Do not change DNS until this note is
followed and mail records are recreated.** Intended web records once
DNS is pointed at GitHub Pages:

- Apex `A` records for `thecurltapes.com`:
  - `185.199.108.153`
  - `185.199.109.153`
  - `185.199.110.153`
  - `185.199.111.153`
- Optional apex `AAAA` records:
  - `2606:50c0:8000::153`
  - `2606:50c0:8001::153`
  - `2606:50c0:8002::153`
  - `2606:50c0:8003::153`
- `www` `CNAME` to `bpz82.github.io`

**Mail records must be copied to the new DNS and kept exactly**, or
@thecurltapes.com mailboxes stop working. These are real Zoho Mail
mailboxes (not Namecheap forwarding). See "Current DNS (rollback)"
below. After a nameserver change, confirm MX, SPF, Zoho verification,
and DKIM are present before relying on mail.

After DNS answers with the GitHub web records, GitHub can issue the
certificate. Then turn on **Enforce HTTPS** in the repo's Pages
settings (or `https_enforced: true` on the Pages API). Do not enforce
HTTPS before the certificate is ready.

Check the lock on https://thecurltapes.com/ and that
`curl -sL https://thecurltapes.com/index.html | md5sum` matches the
build you published. Before DNS is switched, check the Pages copy with:

```bash
curl -sS --http1.1 -H 'Host: thecurltapes.com' http://185.199.108.153/index.html | md5sum
```


## Rollback note — forms pointed at Netlify (Nov 15, 2026, 9:07 PM ET)

Previous good GitHub Pages commit on `bpz82/thecurltapes-site` `main`,
before form endpoints were changed to absolute Netlify URLs:

- `116e4fe4b9a8556be7dd7b2faa3c316fc6cfe263`
  ("Add thecurltapes.com rebuild for GitHub Pages (index.md5 7338e464115dc0b68b260ba59dbc31dd).",
  7:54 PM ET)

To roll the pages back to that build (form endpoints relative again,
so forms on GitHub Pages would only use the mailto fallback):

```bash
cd /workspace/thecurltapes-site-repo
git checkout 116e4fe4b9a8556be7dd7b2faa3c316fc6cfe263 -- .
# re-apply CNAME and .nojekyll if missing
printf '%s\n' 'thecurltapes.com' > CNAME
: > .nojekyll
git -c user.name=WEBSITE -c user.email=website@box add -A
git -c user.name=WEBSITE -c user.email=website@box commit -m "Roll pages back to 116e4fe4 (pre-Netlify form URLs)."
git push origin main
```

Or push that commit's tree to `main` another way. Then wait for the
Pages build (`gh api repos/bpz82/thecurltapes-site/pages/builds/latest`)
and re-check the index.md5. Do not delete the later commit or this
repository. What this rollback cannot undo: form emails already sent
via Resend; DNS or certificate changes (none are made in this pages
publish); visitors' cached `config.js`.

## Current DNS (rollback) — checked Nov 15, 2026, 7:54 PM ET, read-only via dns.google DoH

Nothing below was changed. Use these records to put the domain back on
the Squarespace site and to keep mail working if nameservers move.

Nameservers (Squarespace Domains / NS1):

- `dns1.p01.nsone.net`
- `dns2.p01.nsone.net`
- `dns3.p01.nsone.net`
- `dns4.p01.nsone.net`

Web:

- Apex `A` records for `thecurltapes.com`:
  - `198.49.23.144`
  - `198.49.23.145`
  - `198.185.159.144`
  - `198.185.159.145`
- No apex `AAAA` or `CAA` records
- `www` `CNAME` to `ext-sq.squarespace.com`

Mail (Zoho Mail mailboxes, not Namecheap forwarding). Incoming MX
points at Zoho. The SPF record also includes Namecheap's forwarding
SPF (`spf.efwd.registrar-servers.com`), which may be leftover or used
for forwarded mail, but delivery itself is Zoho:

- `MX` `10 mx.zoho.com`
- `MX` `20 mx2.zoho.com`
- `MX` `50 mx3.zoho.com`
- `TXT` `v=spf1 include:zohomail.com include:spf.efwd.registrar-servers.com ~all`
- `TXT` `zoho-verification=zb37577453.zmverify.zoho.com`
- `zmail._domainkey` `TXT` (DKIM):
  `v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCWC6j8Wk6iiItVWAcOLFj0Cbrbp/0TOZHtEvDk1I+xJva3dF8VUWodN/hdNIOInZv6jtixNwdgMvohvMW91vcLe569EcmiNGG3n55/8u93MEtQz6mWc/Y7Bmc2EZyW8AT9tYVmQ11A4AUyogqsHzLGWBcyKX74WmfwK4gqqeacYwIDAQAB`
- No `_dmarc` record
- No `autoconfig`, `autodiscover`, `mail`, `email`, `smtp`, or `imap` hosts

SOA (informational): `dns1.p01.nsone.net. hostmaster.nsone.net. 1754433915 43200 7200 1209600 3600`

## Push a new build

1. Update files in `/workspace/thecurltapes-site/public/` (see README
   and `tools/`). Do not delete the previous copy; keep a dated
   duplicate if you replace the live files.
2. Update the GitHub Pages repo from `public/` (not from `_source/`
   or a mid-edit working folder):

   ```bash
   SRC=/workspace/thecurltapes-site/public
   REPO=/workspace/thecurltapes-site-repo   # or a fresh clone of bpz82/thecurltapes-site
   # Copy only the site files. Leave CNAME and .nojekyll in place.
   cp -a "$SRC"/. "$REPO/"
   # Re-apply CNAME in case a publish folder ever overwrote it.
   printf '%s\n' 'thecurltapes.com' > "$REPO/CNAME"
   : > "$REPO/.nojekyll"
   cd "$REPO"
   git add -A
   git -c user.name=WEBSITE -c user.email=website@box status
   git -c user.name=WEBSITE -c user.email=website@box commit -m "Publish thecurltapes build <md5 or label>."
   git push origin main
   ```

3. Confirm the pushed `index.html` md5, wait for the Pages build
   (`gh api repos/bpz82/thecurltapes-site/pages/builds/latest`), then
   check the Host-header request (and https://thecurltapes.com/ once
   DNS is pointed).
4. A bad Pages deploy is rolled back by checking out the previous
   good commit in `thecurltapes-site` and pushing it to `main`, or by
   copying a saved previous `public/` into the Pages repo and
   pushing. Then re-check the md5. GitHub Pages may take a short
   time to rebuild. Visitors' browsers may keep a cached copy until
   they reload.

## Roll DNS back to Squarespace

Use this if thecurltapes.com should show the old Squarespace site
again. This does not delete the GitHub repo or the rebuild folder.

1. If nameservers were changed, set them back to Squarespace:
   - `dns1.p01.nsone.net`
   - `dns2.p01.nsone.net`
   - `dns3.p01.nsone.net`
   - `dns4.p01.nsone.net`
2. If the domain is on Namecheap BasicDNS instead, use these web
   records (Squarespace's own targets) **and recreate the Zoho mail
   records from "Current DNS (rollback)"**:
   - Apex `A` records: `198.49.23.144`, `198.49.23.145`,
     `198.185.159.144`, `198.185.159.145`
   - `www` `CNAME` to `ext-sq.squarespace.com`
   - Zoho `MX`, SPF `TXT`, `zoho-verification` `TXT`, and
     `zmail._domainkey` `TXT` exactly as listed above
3. Wait for DNS to spread, then confirm https://thecurltapes.com/ is
   the Squarespace site again, and that mail still arrives.
4. Leave the GitHub Pages repo in place. You can turn Pages off later
   if you want, but do not delete the repo without asking Blake first.

## What a rollback can't undo

- DNS changes and certificate issuance take time and can't be snapped
  back instantly.
- This site stores no visitor data and sends no server-side writes on
  GitHub Pages, so there is nothing in an app database to undo.
- If mail records (Zoho MX, SPF, verification, DKIM) are dropped
  during a DNS change, @thecurltapes.com inboxes can stop working
  until those records are put back. That cannot be undone by reverting
  the website files.
- Forms on GitHub Pages do not write to a backend; any submissions
  that used the mailto fallback only exist in the sender's mail.
- Do not cancel the Squarespace website plan without Blake's OK.
  That is a billing change.

