# adidas-monitor-2 (re-upload)

Adidas stock tracking monitor from product links with discord webhook notifications. 

### Install

1. Download repository as zip and extract or `git clone`.
2. Using terminal in downloaded repository folder enter: `npm install`.
3. Rename `config-sample.json` → to `config.json`, add product links in `"products": [...]`, add discord webhook link in `"discord": "..."`.
3. Enter in the terminal: `npm start`.

> **request-promise** is deprecated, script can stop working correctly in futute. 