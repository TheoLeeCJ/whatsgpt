const { Client, LocalAuth } = require('whatsapp-web.js');
const process = require("process");
const fs = require("fs");

const config = JSON.parse(fs.readFileSync("allowed.json", "utf-8"));
const allowedGroups = config.groups;
const allowedUsers = config.users;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

client.on('qr', (qr) => {
  console.log('QR RECEIVED', qr);
});

client.on('ready', () => {
  console.log('Client is ready!');
});

async function getResponse(model, msg) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "post",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: "You are an automated chatbot used in WhatsApp. Reply to the user as you would handle default requests on chatgpt.com." },
        { role: 'user', content: msg }
      ]
    })
  }).then(res => res.json());

  console.log(res.choices[0].message.content);
  return res.choices[0].message.content;
}

async function getImg(prompt) {
  // Not implemented yet
}

client.on('message', async msg => {
  console.log(msg.from);
  if (!(allowedGroups.includes(msg.from) || allowedUsers.includes(msg.from))) return;

  const mentions = await msg.getMentions();

  // if group
  if (allowedGroups.includes(msg.from)) {
    if (!mentions[0]) return;
    if (mentions[0] && mentions[0].pushname !== "o3") return;
  }

  console.log(msg.body);

  const sanitised = msg.body.replace(/@\d{6,30}/g, ' ').replace(/\s+/g, ' ')
    .replace("/think", "").replace("/nothink", "");

  console.log(sanitised);

  if (msg.body.includes("/think")) {
    msg.reply("Thinking...");
    msg.reply(await getResponse("o4-mini", sanitised));
  }
  else if (msg.body.includes("/nothink")) {
    msg.reply(await getResponse("gpt-4.1", sanitised));
  }
  else {
    msg.reply("Usage: \n\n@o3 /think How many r's are there in 'strawberry'?\n@o3 /nothink Hello, how are you?");
  }
});

client.initialize();
