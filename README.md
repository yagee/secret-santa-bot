# Secret Santa Bot

A Telegram bot for organizing Secret Santa events.

## Prerequisites

- [Node.js](https://nodejs.org/) (version 14 or higher)
- [pnpm](https://pnpm.io/)

## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/yourusername/secret-santa-bot.git
   cd secret-santa-bot
   ```

2. Install dependencies:

   ```sh
   pnpm i
   ```

3. Fill `.env` with credentials:

   ```sh
   cp .env.example .env
   # Edit .env with your preferred editor to add the necessary credentials
   ```

## Usage

Run the bot:

```sh
node index.js
```

## Commands

| Command    | Action                                       |
| :--------- | :------------------------------------------- |
| `/start`   | Start interaction with the bot               |
| `/shuffle` | Shuffle users and send `users.json` to admin |
| `/send`    | Send matching pairs to users                 |
| `/reset`   | Delete users and start over                  |
| `/end`     | Set flag indicating Secret Santa is over     |
