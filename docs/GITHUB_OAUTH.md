# GitHub OAuth Setup

Kenari supports GitHub OAuth for team login. You need **two separate OAuth Apps** — one for development, one for production.

## 1. Create Development OAuth App

Go to **https://github.com/settings/applications/new** (your personal account):

| Field | Value |
|-------|-------|
| Application name | `Kenari — Dev` |
| Homepage URL | `http://localhost:5173` |
| Callback URL | `http://localhost:5173/auth/github/callback` |

Copy the **Client ID** and **Client Secret** into `.env.local`:

```env
GITHUB_CLIENT_ID=<your_dev_client_id>
GITHUB_CLIENT_SECRET=<your_dev_client_secret>
```

## 2. Create Production OAuth App

Go to **https://github.com/settings/applications/new** (or your org's settings):

| Field | Value |
|-------|-------|
| Application name | `Kenari` |
| Homepage URL | `https://monitor.yourdomain.com` |
| Callback URL | `https://monitor.yourdomain.com/auth/github/callback` |

Copy the **Client ID** and **Client Secret** into `.env.production`:

```env
GITHUB_CLIENT_ID=<your_prod_client_id>
GITHUB_CLIENT_SECRET=<your_prod_client_secret>
```

## Why two apps?

GitHub OAuth Apps are bound to a single callback URL. `localhost` and your production domain are different URLs, so they require separate registrations.

## Organization OAuth App

If you want to restrict login to members of a GitHub organization, you can register the OAuth App under the org account instead of your personal account. The setup is identical — just navigate to your org's **Settings → Developer settings → OAuth Apps**.

> **Note:** Kenari does not currently enforce org membership. Any GitHub user who authenticates will get a `viewer` role. The first user to log in becomes `admin`. Role management is on the [roadmap](../README.md#roadmap).
