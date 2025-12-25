# Suno Auth Requests Reference (Logged-in Session)

Captured: Dec 25, 2025

## Key Findings

### Cookies Being Sent to auth.suno.com

The real browser sends ALL these cookies to `auth.suno.com`:
- `__client` - Main JWT token
- `__client_Jnxw-muT` - Session-specific variant (suffix varies)
- `__client_uat=0` AND `__client_uat=1766669345` - BOTH values sent!
- `__client_uat_Jnxw-muT=1766669345` - Session-specific UAT

### Set-Cookie Response from /v1/client

The server responds with:
```
set-cookie: __client=eyJ...; HttpOnly; Max-Age=31536000; Path=/; SameSite=None; Secure
set-cookie: __client_uat=1766669345; Domain=suno.com; Max-Age=31536000; Path=/; SameSite=Lax; Secure
set-cookie: __client_Jnxw-muT=eyJ...; HttpOnly; Max-Age=31536000; Path=/; SameSite=None; Secure
set-cookie: __client_uat_Jnxw-muT=1766669345; Domain=suno.com; Max-Age=31536000; Path=/; SameSite=Lax; Secure
```

Note: `__client` cookies have NO Domain specified (defaults to exact host `auth.suno.com`)
Note: `__client_uat` cookies have `Domain=suno.com` (applies to all subdomains)

---

## Request 1: GET /v1/client (Status 200)

```
URL: https://auth.suno.com/v1/client?__clerk_api_version=2025-11-10&_clerk_js_version=5.117.0
Method: GET
Status: 200 OK
```

### Request Headers
```
:authority: auth.suno.com
:method: GET
:path: /v1/client?__clerk_api_version=2025-11-10&_clerk_js_version=5.117.0
:scheme: https
accept: */*
accept-encoding: gzip, deflate, br, zstd
accept-language: en-US,en;q=0.9
origin: https://suno.com
referer: https://suno.com/
sec-ch-ua: "Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "Linux"
sec-fetch-dest: empty
sec-fetch-mode: cors
sec-fetch-site: same-site
user-agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36
```

### Cookie Header (full)
```
cookie: _axwrt=d78e3e1a-6626-4761-8992-957d867692f5; _scid=4kPZQDayG8OTmpJFX-CfEPNYlcOU_-0C; _ga=GA1.1.456506496.1766591533; __client_uat_U9tcbTPE=0; _ScCbts=%5B%5D; singular_device_id=f4dd8246-2160-423e-a575-f20f7e9af150; ajs_anonymous_id=9717283b-39c5-4acf-9a8d-231bed688695; _fbp=fb.1.1766591533512.237477796364675093; _sctr=1%7C1766552400000; _tt_enable_cookie=1; _ttp=01KD8GZ5P79ZQSXMG9EZBMSMYY_.tt.1; _clck=1jo8fcy%5E2%5Eg24%5E0%5E2184; __stripe_mid=a40eaab5-6024-487a-816f-5618f2c668f1ff7e1d; __client_uat=0; __client_uat=1766669345; __client_uat_Jnxw-muT=1766669345; _gcl_au=1.1.931866959.1766591533.1494397152.1766669349.1766669348; _sp_ses.e685=*; __stripe_sid=4917fccc-1ffd-491d-adfa-133bda3f3a864f41e8; _ga_7B0KEDD7XP=GS2.1.s1766681297$o5$g1$t1766682265$j60$l0$h0$dak5DCDNqtI9UKAWGWvZ9JBo4J4YmG4l83Q; _scid_r=9MPZQDayG8OTmpJFX-CfEPNYlcOU_-0CGtisdg; _uetsid=84109cb0e0e011f081155f3cbbd8f817|suq524|2|g25|0|2184; _sp_id.e685=ac1f20d7-31dc-442e-aaa6-737f8046ea00.1766591533.5.1766683120.1766677875.28caa5b4-c26d-4032-b2ab-4750988b4433.8aef2cc8-1073-49bf-9bdf-d78267736858.aab0fd6d-d968-4d73-b882-09c17158777a.1766681297796.8; ttcsid=1766681297833::fXCYSQucUjWz8B3mqsKL.5.1766683120848.0; ttcsid_CT67HURC77UB52N3JFBG=1766681297833::uKnAIVXZ3_DzbpBFfClp.5.1766683120848.1; __client=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdW5vLmNvbS9jbGFpbXMvY2xpZW50X2lkIjoiY2xpZW50X3docEdqbnVkSHFpNmJ1dkZUQjNVQ1kiLCJzdW5vLmNvbS9jbGFpbXMvdG9rZW5fdHlwZSI6InJlZnJlc2giLCJpc3MiOiJodHRwczovL2F1dGguc3Vuby5jb20iLCJleHAiOjE3OTgyMTkxMjB9.tM7Ba7L8RiPsbsAoAc3VSyTqvq_ltwjsndlKn1TRGXiho947n43_GSxHvb5YS0oiwxNJrQblTVAYb4vB6mpUflqeOUTitN3sRMrgc5lMv4RE4pNP8j6xREbQDh92LLA3joMaPMDA6ql0H_rf850unMR1xDTXKZ1fsrlVywq46CRUYapIM6MM21zcizOEURyNG6ujClJRM4BF4mqc7Yg2vInEgzd8AKlch-bYxTxY_dEXBKUaNlkoQrbMYz4ZraTNRDcudv9KJYiUfuAmKBafGvAA_3OwCPzaMBsDC4UjkX1W6FsK8D7tM1kT0LSS5cAFYYiqrGerTHqsj6FDcLHamg; __client_Jnxw-muT=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdW5vLmNvbS9jbGFpbXMvY2xpZW50X2lkIjoiY2xpZW50X3docEdqbnVkSHFpNmJ1dkZUQjNVQ1kiLCJzdW5vLmNvbS9jbGFpbXMvdG9rZW5fdHlwZSI6InJlZnJlc2giLCJpc3MiOiJodHRwczovL2F1dGguc3Vuby5jb20iLCJleHAiOjE3OTgyMTkxMjB9.tM7Ba7L8RiPsbsAoAc3VSyTqvq_ltwjsndlKn1TRGXiho947n43_GSxHvb5YS0oiwxNJrQblTVAYb4vB6mpUflqeOUTitN3sRMrgc5lMv4RE4pNP8j6xREbQDh92LLA3joMaPMDA6ql0H_rf850unMR1xDTXKZ1fsrlVywq46CRUYapIM6MM21zcizOEURyNG6ujClJRM4BF4mqc7Yg2vInEgzd8AKlch-bYxTxY_dEXBKUaNlkoQrbMYz4ZraTNRDcudv9KJYiUfuAmKBafGvAA_3OwCPzaMBsDC4UjkX1W6FsK8D7tM1kT0LSS5cAFYYiqrGerTHqsj6FDcLHamg; _uetvid=b341a460b69011f09283dff3ed69913c|13k8odx|1766684138492|16|1|bat.bing.com/p/conversions/c/e; ax_visitor=%7B%22firstVisitTs%22%3A1766591533009%2C%22lastVisitTs%22%3A1766591533009%2C%22currentVisitStartTs%22%3A1766667815691%2C%22ts%22%3A1766684178630%2C%22visitCount%22%3A2%7D
```

### Response Headers
```
access-control-allow-credentials: true
access-control-allow-methods: GET, POST, OPTIONS, PUT, PATCH, DELETE
access-control-allow-origin: https://suno.com
content-type: application/json; charset=utf-8
set-cookie: __client=eyJ...; expires=Fri, 25 Dec 2026 17:36:19 GMT; HttpOnly; Max-Age=31536000; Path=/; SameSite=None; Secure
set-cookie: __client_uat=1766669345; Domain=suno.com; expires=Fri, 25 Dec 2026 17:36:19 GMT; Max-Age=31536000; Path=/; SameSite=Lax; Secure
set-cookie: __client_Jnxw-muT=eyJ...; expires=Fri, 25 Dec 2026 17:36:19 GMT; HttpOnly; Max-Age=31536000; Path=/; SameSite=None; Secure
set-cookie: __client_uat_Jnxw-muT=1766669345; Domain=suno.com; expires=Fri, 25 Dec 2026 17:36:19 GMT; Max-Age=31536000; Path=/; SameSite=Lax; Secure
```

---

## Request 2: POST /v1/client/verify (Status 204)

```
URL: https://auth.suno.com/v1/client/verify?__clerk_api_version=2025-11-10&_clerk_js_version=5.117.0
Method: POST
Status: 204 No Content
Content-Type: application/x-www-form-urlencoded
Content-Length: 1077
```

Same cookie header as above.

---

## Request 3: GET /v1/environment (Status 200)

```
URL: https://auth.suno.com/v1/environment?__clerk_api_version=2025-11-10&_clerk_js_version=5.117.0
Method: GET
Status: 200 OK
```

Same cookie header as above.

---

## Critical Auth Cookies Summary

| Cookie | Domain | HttpOnly | Secure | SameSite | Purpose |
|--------|--------|----------|--------|----------|---------|
| `__client` | auth.suno.com (exact) | Yes | Yes | None | Main JWT refresh token |
| `__client_Jnxw-muT` | auth.suno.com (exact) | Yes | Yes | None | Session-specific JWT |
| `__client_uat` | .suno.com | No | Yes | Lax | User active timestamp |
| `__client_uat_Jnxw-muT` | .suno.com | No | Yes | Lax | Session-specific UAT |

Note: The suffix `Jnxw-muT` appears to be a session identifier that varies per session.
