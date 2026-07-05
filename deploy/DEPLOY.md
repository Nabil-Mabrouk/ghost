# Deploying GHOST-WALK to a Contabo Ubuntu VPS

The app is a static export — no Node, no database, no backend on the server.
The server's only jobs: serve files and terminate HTTPS.

**HTTPS is mandatory, not cosmetic:** WebGPU, `getUserMedia` (camera/mic), and
service workers only run in a secure context. `http://<ip>` will load the
landing page and then fail inside the app. Caddy gives you automatic
Let's Encrypt certificates, which is why this guide uses it over nginx.

## 0. Prerequisites

- Contabo VPS with Ubuntu 22.04/24.04, root or sudo SSH access.
- A DNS name pointing at the VPS. Either:
  - your own domain/subdomain with an **A record** to the server IP, or
  - zero-setup fallback: `sslip.io` — the name `203-0-113-7.sslip.io`
    automatically resolves to `203.0.113.7` (dots become dashes). Works with
    Let's Encrypt.

## 1. Build locally (Windows)

```powershell
cd C:\Projects\989-Hackathon-2026
# put the demo film where the landing page expects it (once):
#   public\demo\ghostwalk-demo.mp4
npm test
npm run build        # -> out\
```

## 2. Prepare the server (once)

SSH in (`ssh root@<server-ip>`) and run:

```bash
apt update && apt upgrade -y

# Caddy (official repo)
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

# web root
mkdir -p /var/www/ghostwalk

# firewall (Contabo images often ship with ufw inactive — enable it)
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

## 3. Configure Caddy (once)

Copy `deploy/Caddyfile` to `/etc/caddy/Caddyfile`, **edit the first line**
to your domain (or `<ip-with-dashes>.sslip.io`), then:

```bash
systemctl reload caddy
```

Caddy fetches the certificate on the first request — the domain must already
resolve to the server before this step.

## 4. Upload the build (every deploy)

From Windows PowerShell (OpenSSH's `scp` is built in):

```powershell
cd C:\Projects\989-Hackathon-2026
scp -r out\* root@<server-ip>:/var/www/ghostwalk/
```

Faster on re-deploys, if you have rsync (Git Bash / WSL):

```bash
rsync -avz --delete out/ root@<server-ip>:/var/www/ghostwalk/
```

## 5. Verify (in order — each depends on the previous)

1. `https://<your-domain>/` → landing page, padlock valid, demo film plays.
2. **LAUNCH THE APP** → `/init` boot screen shows `ENGINE: WEBGPU`.
3. INITIALIZE SYSTEM → models download from huggingface.co and reach READY
   (visitors pay the ~1.5GB once; it caches in *their* browser).
4. WALK → browser prompts for camera/mic — proves the secure context.
5. Full loop: import a photo → LOG EVENT → SLEEP → BRIEFING.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Certificate errors / http only | Domain doesn't resolve to the VPS yet — check the A record, then `systemctl reload caddy` |
| `ENGINE: WASM` on a machine that shows WEBGPU locally | You're on plain HTTP, or the visitor's browser lacks WebGPU |
| Camera/mic never prompts | Same — secure-context failure; check the padlock |
| `/walk` 404s on refresh | `try_files` line missing from the Caddyfile |
| Model download stalls | It's the visitor's connection to huggingface.co — not your server; the weights never touch your VPS |
| Stale app after redeploy | `sw.js` is no-cache (Caddyfile) so two reloads pick it up; hard-reload (Ctrl+Shift+R) forces it |

## Notes

- The server never sees photos, voice, or inference — the privacy story
  survives deployment; the VPS is a dumb file host.
- Keep the GitHub Pages / localhost workflow for judging; the VPS is the
  public "try it" link for the landing page.
