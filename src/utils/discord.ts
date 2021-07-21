import axios from 'axios';
const WhLink = process.env.WHLINK;

export async function discordLog(msg: string): Promise<void> {
  try {
    await axios.post(WhLink, { content: msg, timeout: 5000 });
  } catch (err) {
    console.log(err);
    throw Error('Could not log to discord(not very important) <@&847275183114027028>');
  }
}