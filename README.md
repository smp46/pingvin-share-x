# <div align="center"><img src="https://github.com/user-attachments/assets/b5bc0c1e-5641-4106-b322-a1b0f5448b0f" width="60"/> </br>Pingvin Share X</div>



Pingvin Share X is a fork of [Pingvin Share](https://github.com/stonith404/pingvin-share), a self-hosted file sharing platform and an alternative for WeTransfer.

## Features

- Share files using a link
- Unlimited file size (restricted only by disk space)
- Set an expiration date for shares
- Secure shares with visitor limits and passwords
- Email recipients
- Reverse shares
- OIDC and LDAP authentication
- Integration with ClamAV for security scans
- Different file providers: local storage and S3


## Setup

### Installation with Docker (recommended)

1. Download the `docker-compose.yml` file
2. Run `docker compose up -d`

The website is now listening on `http://localhost:3000`, have fun with Pingvin Share!

> [!TIP]
> Checkout [stonith404/Pocket ID](https://github.com/stonith404/pocket-id), a user-friendly OIDC provider that lets you easily log in to services like Pingvin Share using Passkeys. Made by the original creator of Pingvin Share.

##  Documentation

For more installation options and advanced configurations, please refer to the [documentation](https://smp46.github.io/pingvin-share).

## Contribute

We would love it if you want to help make Pingvin Share better! You can either [help to translate](https://smp46.github.io/pingvin-share-x/help-out/translate) Pingvin Share or [contribute to the codebase](https://smp46.github.io/pingvin-share-x/help-out/contribute).
