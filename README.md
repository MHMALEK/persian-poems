PersianPoemBot is a Telegram bot designed to fetch Persian poems from ganjoor.com and allpoetry.com. This bot is built with the GrammyJS library and supports both Persian (Farsi) and English languages.

# Features
Fetch Persian poems from ganjoor.com and allpoetry.com
Supports commands in both Persian and English

Powered by the lightweight, flexible Telegram bot framework: GrammyJS

# Requirements

Node.js 14.x or later
npm (usually comes with Node.js)
Getting Started
Firstly, clone the repository:

```
git clone https://github.com/YourUsername/PersianPoemBot.git
cd PersianPoemBot
```

Then, install the dependencies:

```
npm install
```

Before you start the bot, you need to create a .env file in the root directory of your project, and add the following content:

TELEGRAM_BOT_API_TOKEN_PROD=<Your Telegram Bot Token>
TELEGRAM_BOT_API_TOKEN_DEV=<Your Telegram Bot Token for development>
Replace <Your Telegram Bot Token> with your actual Bot token that you received from the BotFather on Telegram.

Now you can start the bot in development mode (watching changes included) and it will use your TELEGRAM_BOT_API_TOKEN_DEV and you can see your development bot will be updated:

```
npm start
```

to run it in **production**, run this command to build the app first for production env and then running it using node.

```
npm run build
```

and then run 

```
node dist/index.js
```

# Usage
To fetch a poem, send the /poem command to the bot. The bot will reply with a random Persian poem from ganjoor.com or allpoetry.com.

For further assistance, send the /help command to the bot.

# Contribution
If you'd like to contribute to the development of PersianPoemBot, please feel free to fork the repository, make your changes and submit a pull request. We appreciate your efforts to help improve the bot.

# Support
If you encounter any issues or require further assistance, you can create an issue in the repository. We'll do our best to help you out.

# License
This project is licensed under the MIT License. See the LICENSE file for more details.

# Disclaimer
This bot is not affiliated with ganjoor.com or allpoetry.com. It's a personal project and uses public APIs provided by these websites.
