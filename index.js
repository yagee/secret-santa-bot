import dotenv from 'dotenv';
import fs from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import path from 'path';
import { fileURLToPath } from 'url';

const relativePath = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.resolve(relativePath + '/.env'),
});

const ADMIN = process.env['ADMIN_CHAT_ID'];
const TOKEN = process.env['BOT_TOKEN'];
const SANTA_IS_OVER = process.env['SANTA_IS_OVER'] === 'true' ? true : false;

const bot = new TelegramBot(TOKEN, {
  polling: true,
});

const bannedUsers = [];

let santaIsOver = SANTA_IS_OVER;

bot.onText(/\/start/, async (msg, match) => {
  if (santaIsOver) {
    return;
  }
  const chatId = msg.chat.id;

  if (bannedUsers.includes(chatId)) {
    bot.sendMessage(
      chatId,
      `Привет, <b>${msg.from.first_name}</b>!\nК сожалению, ты не можешь участвовать в «Тайном Санте».`,
      {
        parse_mode: 'HTML',
      },
    );
    return;
  }

  msg.from.step = 0;

  await fs.writeFile(
    path.join(relativePath, `users/${msg.from.id}.json`),
    JSON.stringify(msg.from),
    (err) => {
      if (err) console.log(err);
      else {
        // console.log('File written successfully\n');
      }
    },
  );

  const name = msg.from.last_name
    ? `${msg.from.first_name} ${msg.from.last_name}`
    : msg.from.first_name;

  const opts = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Изменить имя',
            callback_data: 'edit_name',
          },
        ],
        [
          {
            text: 'Добавить пожелания к подарку',
            callback_data: 'edit_gift_wishes',
          },
        ],
      ],
    },
  };

  bot.sendMessage(
    chatId,
    `Привет, <b>${name}</b>!\nИзмени имя на свои Имя и Фамилию, если сейчас оно отображается иначе, чтобы даритель смог понять, кому готовить подарок 🎄`,
    { ...opts, parse_mode: 'HTML' },
  );
});

bot.on('callback_query', function onCallbackQuery(callbackQuery) {
  const action = callbackQuery.data;
  const msg = callbackQuery.message;
  const opts = {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
  };
  let text;

  const userData = fs.readFileSync(
    path.join(relativePath, `users/${msg.chat.id}.json`),
    'utf8',
  );
  const user = JSON.parse(userData);

  if (action === 'edit_name') {
    text = 'Введите новое имя:';

    user.step = 1;
  }

  if (action === 'edit_gift_wishes') {
    text = 'Введите ваши пожелания к подарку:';

    user.step = 2;
  }

  fs.writeFile(
    path.join(relativePath, `users/${msg.chat.id}.json`),
    JSON.stringify(user),
    (err) => {
      if (err) console.log(err);
      else {
        // console.log('File written successfully\n');
      }
    },
  );

  bot.editMessageText(text, opts);
});

bot.on('message', async (msg) => {
  const userDir = path.join(relativePath, 'users');
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir);
  }

  if (santaIsOver) {
    return;
  }

  if (
    msg.text === '/start' ||
    msg.text === '/shuffle' ||
    msg.text === '/send' ||
    msg.text === '/reset' ||
    msg.text === '/end'
  ) {
    return;
  }
  const chatId = msg.from.id;

  if (bannedUsers.includes(chatId)) {
    bot.sendMessage(
      chatId,
      `Привет, <b>${msg.from.first_name}</b>!\nК сожалению, ты не можешь участвовать в «Тайном Санте».`,
      {
        parse_mode: 'HTML',
      },
    );
    return;
  }

  const filePath = path.join(relativePath, `users/${chatId}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`Файл ${filePath} не существует`);
    bot.sendMessage(chatId, `Привет, чтобы начать нажми /start`, {
      parse_mode: 'HTML',
    });
    return false;
  }

  let user;

  try {
    const userData = fs.readFileSync(filePath, 'utf8');
    user = JSON.parse(userData);
  } catch (error) {
    console.log('Ошибка при чтении файла:', error);
    return false;
  }

  switch (user.step) {
    case 1:
      user.true_name = msg.text;
      user.step = 8;
      saveUser();
      break;
    case 2:
      user.gift_wishes = msg.text;
      user.step = 9;
      saveUser();
    default:
      break;
  }

  function saveUser() {
    fs.writeFile(
      path.join(relativePath, `users/${chatId}.json`),
      JSON.stringify(user),
      (err) => {
        if (err) console.log(err);
        else {
          // console.log('File written successfully\n');
        }
      },
    );
  }

  const opts = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Изменить имя',
            callback_data: 'edit_name',
          },
        ],
        [
          {
            text: user.gift_wishes
              ? 'Изменить пожелания к подарку'
              : 'Добавить пожелания к подарку',
            callback_data: 'edit_gift_wishes',
          },
        ],
      ],
    },
  };

  user.name =
    user.true_name ||
    (user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name);

  let message = `Имя: ${user.name}`;
  // if (user.gift_wishes) {
  //   message = message + `\nПожелания к подарку: ${user.gift_wishes}`;
  // }

  message = `Теперь ты участвуешь в «Тайном Санте»🎉\nСкоро тебе придет имя счастливчика, которому ты даришь подарок, а кому-то выпадешь ты.\nСейчас ты записан под именем: <b>${user.name}</b>`;
  if (user.gift_wishes) {
    message =
      message + `\nТвои пожелания к подарку: <b>${user.gift_wishes}</b>`;
  }

  bot.sendMessage(msg.from.id, message, { ...opts, parse_mode: 'HTML' });
  // bot.sendMessage(
  //   msg.from.id,
  //   `Теперь ты участвуешь в «Тайном Санте»🎉 Скоро тебе придет имя счастливчика, которому ты даришь подарок, а кому-то выпадешь ты.`
  // );
});

bot.onText(/\/shuffle/, async (msg) => {
  if (msg.chat.id == ADMIN) {
    const usersDir = path.join(relativePath, '/users');
    const userFiles = fs.readdirSync(usersDir);
    const users = userFiles.map((file) => {
      const userData = fs.readFileSync(path.join(usersDir, file), 'utf8');
      const user = JSON.parse(userData);

      // Use true_name if defined, otherwise use first_name and last_name if defined, otherwise use only first_name
      user.name =
        user.true_name ||
        (user.last_name
          ? `${user.first_name} ${user.last_name}`
          : user.first_name);

      user.assigned_gift = '';

      return user;
    });

    // Fisher-Yates shuffle algorithm
    for (let i = users.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [users[i], users[j]] = [users[j], users[i]];
    }

    // Assign pairs
    for (let i = 0; i < users.length; i++) {
      if (i !== users.length - 1) {
        users[i].assigned_user = users[i + 1].name;
        users[i].assigned_gift = users[i + 1].gift_wishes;
      } else {
        users[i].assigned_user = users[0].name; // Assign the last user to the first user
        users[i].assigned_gift = users[0].gift_wishes; // Assign the last user to the first user
      }
    }

    const usersFilePath = path.join(relativePath, '/users.json');
    fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), (err) => {
      if (err) {
        console.log(err);
      } else {
        // Send the file to the admin
        bot
          .sendDocument(ADMIN, usersFilePath)
          .then(() => {
            console.log('File sent to admin successfully');
          })
          .catch((error) => {
            console.log('Error sending file to admin:', error);
          });
      }
    });

    // console.log('Users shuffled successfully');
  }
});

bot.onText(/\/send/, (msg) => {
  if (msg.chat.id == ADMIN) {
    const jsonData = fs.readFileSync(
      path.join(relativePath, '/users.json'),
      'utf8',
    );

    const users = JSON.parse(jsonData);

    users.forEach((user) => {
      // console.log(user.id);
      let message = `Привет, ${user.name}!\nТвой секретный санта: ${user.assigned_user}`;
      if (user.assigned_gift) {
        message = message + `\nПожелания к подарку: ${user.assigned_gift}`;
      }
      bot.sendMessage(user.id, message);
    });
  }
});

bot.onText(/\/reset/, (msg) => {
  if (msg.chat.id == ADMIN) {
    const usersDir = path.join(relativePath, '/users');
    const userFiles = fs.readdirSync(usersDir);
    userFiles.forEach((file) => {
      fs.unlinkSync(path.join(usersDir, file));
    });

    fs.unlinkSync(path.join(relativePath, '/users.json'));
  }
});

const variableName = 'SANTA_IS_OVER';
const envPath = path.join(relativePath, '/.env');

bot.onText(/\/end/, (msg) => {
  if (msg.chat.id == ADMIN) {
    try {
      const envContent = fs.existsSync(envPath)
        ? fs.readFileSync(envPath, 'utf8')
        : '';
      const lines = envContent.split('\n');

      let variableFound = false;
      const updatedLines = lines.map((line) => {
        if (line.startsWith(`${variableName}=`)) {
          variableFound = true;
          const [, value] = line.split('=');
          const newValue = true;
          return `${variableName}=${newValue}`;
        }
        return line;
      });
      fs.writeFileSync(envPath, updatedLines.join('\n'), 'utf8');
      console.log(`Updated ${variableName} in .env file.`);
    } catch (error) {
      console.error(`Error updating ${variableName}:`, error);
    }
  }
});
