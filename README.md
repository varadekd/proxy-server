# 🚀 Secure Proxy Server (Reverse + Forward)

A production-ready **Express.js proxy server** with:

-   🔐 Security hardening (Helmet, CORS, Rate Limiting)
-   📦 Compression enabled
-   📝 Structured logging (Winston + Daily Rotation)
-   🔑 Optional API Key authentication
-   🌍 Optional IP Whitelisting
-   ❤️ Health & Readiness endpoints
-   🔄 Reverse Proxy (default mode)
-   🔀 Locked-down Forward Proxy mode
-   🛑 Graceful shutdown handling

------------------------------------------------------------------------

## 📦 Installation

``` bash
git clone <your-repo-url>
cd <your-project>
npm install
```

------------------------------------------------------------------------

## ⚙️ Environment Configuration

Copy the template:

``` bash
cp .env.template .env
```

Then edit `.env` according to your needs.

------------------------------------------------------------------------

## 🔧 Available Environment Variables

  Variable         Required            Description
  ---------------- ------------------- ---------------------------------------
  PORT             ❌                  Server port (default: 7812)
  PROXY_MODE       ❌                  `reverse` (default) or `forward`
  SERVER_URL       ✅ (reverse mode)   Target server URL
  API_KEY          ❌                  If set, requires `x-api-key` header
  ALLOWED_ORIGIN   ❌                  CORS allowed origin (default: \*)
  REQUEST_LIMIT    ❌                  Max request body size (default: 10mb)
  TRUST_PROXY      ❌                  Set to `true` behind load balancer
  IP_WHITELIST     ❌                  Comma-separated list of allowed IPs

------------------------------------------------------------------------

## 🚀 Running the Server

### Development

``` bash
node index.js
```

### Production (recommended)

``` bash
NODE_ENV=production node index.js
```

Or use a process manager:

``` bash
pm2 start index.js --name secure-proxy
```

------------------------------------------------------------------------

## 🔄 Reverse Proxy Mode (Default)

Used when routing traffic to a **fixed backend service**.

Example `.env`:

    PROXY_MODE=reverse
    SERVER_URL=https://api.example.com

All incoming traffic will be forwarded to the configured `SERVER_URL`.

------------------------------------------------------------------------

## 🔀 Forward Proxy Mode

Used when dynamically forwarding to a URL provided in the query string.

Example:

    PROXY_MODE=forward

Request example:

    GET /?url=https://api.example.com/data

⚠ Forward proxy mode should be used carefully and preferably with: - API
key protection - IP whitelisting

------------------------------------------------------------------------

## 🔐 Security Features

### Helmet

Adds secure HTTP headers.

### Rate Limiting

Limits requests to 300 per minute per IP.

### API Key Protection (Optional)

If `API_KEY` is set, clients must include:

    x-api-key: your_secret_key

### IP Whitelisting (Optional)

    IP_WHITELIST=127.0.0.1,192.168.1.10

------------------------------------------------------------------------

## ❤️ Health & Readiness

### Health Check

    GET /health

Response:

``` json
{
  "status": "OK",
  "mode": "reverse",
  "uptime": 1234
}
```

### Readiness Check

    GET /ready

Response:

``` json
{
  "ready": true
}
```

------------------------------------------------------------------------

## 📝 Logging

Logs are stored in:

    /logs/proxy-YYYY-MM-DD.log

Features: - Daily rotation - Max size: 20MB - Retention: 14 days - JSON
structured logs - Console logging enabled

------------------------------------------------------------------------

## 🛑 Graceful Shutdown

Handles:

-   SIGTERM
-   SIGINT

Ensures active connections are properly closed before exit.

------------------------------------------------------------------------

## 🏗 Recommended Production Setup

-   Behind Nginx or Cloudflare
-   Enable HTTPS at edge
-   Use API Key
-   Enable IP Whitelist
-   Set TRUST_PROXY=true when behind load balancer
-   Use PM2 or Docker

------------------------------------------------------------------------

## 📄 License

MIT License
