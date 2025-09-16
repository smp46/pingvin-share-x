> ## Work in Progress Fork 
>
> This is an attempt to just *maintain* stonith404's [Pingvin Share](https://github.com/stonith404/pingvin-share/tree/main). While I'm aware other forks exist, they either seem to be rebadging or rebuilding the app, or making excessive use of AI. So this is my attempt.

# <div align="center"><img  src="https://user-images.githubusercontent.com/58886915/166198400-c2134044-1198-4647-a8b6-da9c4a204c68.svg" width="40"/> </br>Pingvin Share X</div>


Pingvin Share X is a fork of the Pingvin Share, a self-hosted file sharing platform and an alternative for WeTransfer.

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
