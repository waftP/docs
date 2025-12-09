# Waftpay Developer Docs

Mintlify project for Waftpay’s developer documentation (guides, API reference, webhooks).

## Prerequisites
- Node.js **20.18.1** (`nvm use` will pick it up from `.nvmrc`)
- Mintlify CLI: `npm i -g mint`

## Local preview
```
nvm use
mint dev
```
Preview runs at `http://localhost:3000`.

## Common issues
- CLI rejects Node version: ensure `nvm use` selects 20.18.1 before running `mint dev`.
- 404 on a page: confirm the page path exists and is listed in `docs.json`.

## Useful links
- [Mintlify docs](https://mintlify.com/docs)
- [Waftpay dashboard](https://dashboard.waftpay.io)
