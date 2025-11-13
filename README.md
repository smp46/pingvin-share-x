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

The website is now listening on `http://localhost:3000`.

> [!TIP]
> Checkout [stonith404/Pocket ID](https://github.com/stonith404/pocket-id), a user-friendly OIDC provider that lets you easily log in to services like Pingvin Share X using Passkeys. Made by the original creator of Pingvin Share.

## Documentation

For more installation options and advanced configurations, please refer to the [documentation](https://smp46.github.io/pingvin-share).

## Contributing

All contributions are welcome, including issues, feature suggestions, pull requests and more.

### Getting started

If you have found a bug, have suggestion or something else, please create an issue.

### Submit a Pull Request

Before you submit the pull request for review please ensure that

- The pull request naming follows the [Conventional Commits specification](https://www.conventionalcommits.org):

  `<type>[optional scope]: <description>`

  example:

  ```
  feat(share): add password protection
  ```

  When `TYPE` can be:
  - **feat** - is a new feature
  - **doc** - documentation only changes
  - **fix** - a bug fix
  - **refactor** - code change that neither fixes a bug nor adds a feature

- Your pull request has a detailed description
- You run `npm run format` to format the code

### Setup project

#### Backend

1. Open the `backend` folder
2. Install the dependencies with `npm install`
3. Push the database schema to the database by running `npx prisma db push`
4. Seed the database with `npx prisma db seed`
5. Start the backend with `npm run dev`

#### Frontend

1. Start the backend first
2. Open the `frontend` folder
3. Install the dependencies with `npm install`
4. Start the frontend with `npm run dev`

You're all set!

#### Testing

At the moment we only have system tests for the backend. To run these tests, run `npm run test:system` in the backend folder.
