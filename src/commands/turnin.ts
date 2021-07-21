//TODO: split this up into imports/exports
import { Command } from 'discord-akairo';
import { Message, MessageEmbed } from 'discord.js';
import { google } from 'googleapis';
import { Credentials } from 'google-auth-library';
import { numberToEncodedLetter } from '../misc/numberToLetters';
import axios from 'axios';

const WhLink = process.env.WHLINK;
const privatekey = JSON.parse(process.env.GOOGLECREDS);
const spreadsheetId = process.env.GOOGLESHEETID;
const collectionsSheet = 'Copy of Voucher Collections 2.0';
const sheets = google.sheets('v4');
const jwtClient = new google.auth.JWT(
  privatekey.client_email,
  null,
  privatekey.private_key,
  ['https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/calendar']
);
const voucherMoney: ranks= {
  'Pilot': 9000,
  'Seasoned Pilot': 10500,
  'Seasoned Pilot FM': 11025,
  'Fleet Admiral': 12000,
  'Grand Moff': 13500,
};
interface ranks {
  Pilot: number;
  'Seasoned Pilot': number;
  'Seasoned Pilot FM'?: number,
  'Fleet Admiral': number;
  'Grand Moff': number;
}
interface categories {
  collector: number;
  Pilot: number;
  'Seasoned Pilot': number;
  'Seasoned Pilot FM'?: number,
  'Fleet Admiral': number;
  'Grand Moff': number;
  'Last Turn-in': number;
  'Total Vouchers': number;
}
interface Schema$ValueRange {
  majorDimension?: string | null;
  range?: string | null;
  values?: any[][] | null;
}
interface Schema$UpdateValuesResponse {
  spreadsheetId?: string | null;
  updatedCells?: number | null;
  updatedColumns?: number | null;
  updatedData?: Schema$ValueRange;
  updatedRange?: string | null;
  updatedRows?: number | null;
}
export default class TurnInCommand extends Command {
  constructor() {
    super('turnin', {
      aliases: ['turnin'],
      description: '`?turnin [in-game id] [amount]` everything is done automatically.',
      args: [
        {
          id: 'userId',
          type: 'string',
          default: null,
        },
        {
          id: 'amount',
          type: 'number',
          default: null,
        }
      ],
      channel: 'guild',
    });
  }  
  async exec(msg: Message,args: { userId: string, amount: number }): Promise<Message> {
    try {
      const subjectId = args.userId;
      const collectorId = msg.author.id;
      const newVouchersCount = args.amount;
      let hori = 0;
      const verticles: categories = {
        'collector': 0,
        'Pilot': 0,
        'Seasoned Pilot': 0,
        'Seasoned Pilot FM': 0,
        'Fleet Admiral': 0,
        'Grand Moff': 0,
        'Last Turn-in': 0,
        'Total Vouchers': 0,
      };

      //Initial setup and 
      if (!subjectId) return msg.reply('No user specified!');
      else if (!newVouchersCount) return msg.reply('No vouchers amount specified!');
      //else if (newVouchersCount < 10) return msg.reply('We don\'t take less than 10 vouchers :wink:');
      else if (newVouchersCount > 1000000) return msg.reply('no.');
      const originalSheet = await getSheet();
      
      for (let i = 0; i < originalSheet[0].length; i++) {
        const current = originalSheet[0][i];
        if (current.includes(collectorId)) {
          verticles.collector = i;
        }
        else {
          switch (current) {
          case 'Pilot':
            verticles['Pilot'] = i;
            break;
          case 'Seasoned Pilot':
            verticles['Seasoned Pilot'] = i;
            break;
          case 'Fleet Admiral':
            verticles['Fleet Admiral'] = i;
            break;
          case 'Grand Moff':
            verticles['Grand Moff'] = i;
            break;
          case 'Total Vouchers':
            verticles['Total Vouchers'] = i;
            break;
          case 'Last Turn-in':
            verticles['Last Turn-in'] = i;
            break;
          }

        }
        if (current.includes('Last Turn-in')) break;
      }

      for (let i = 0; i < originalSheet.length; i++) {
        const current = originalSheet[i][1];
        if (current.includes('No longer in company')) break;
        if (current.includes(`${subjectId}`)) {
          hori = i;
          break;
        }
      }
      if (verticles.collector === 0) return msg.reply(`Collector "<@${collectorId}>" not found!`);
      else if (hori === 0) return msg.reply(`User "${subjectId}" cannot be found.`);
      else if (verticles['Last Turn-in'] === 0 || verticles['Pilot'] === 0 || verticles['Grand Moff'] === 0 || verticles['Total Vouchers'] === 0) return msg.reply('Nope, the sheet changed... in a bad way');
      
      const subjectRow:any[] | string[] = originalSheet[hori];
      const subject:string = subjectRow[0];
      const previousVouchers = subjectRow[verticles.collector] ? parseSheet(subjectRow[verticles.collector]) : 0;
      const newVouchers = previousVouchers + newVouchersCount;
      const subjectRank:keyof(ranks) = subjectRow[2];
      if (subjectRank.includes('CEO')) return msg.reply('Cannot add vouchers to CEO ranks');
      if (!subjectRank) return msg.reply('User has no rank');
      const cleanSubjectRank:keyof(ranks) = subjectRank == 'Seasoned Pilot FM'? 'Seasoned Pilot': subjectRank;
      const previousVoucherTotal = subjectRow[verticles[cleanSubjectRank]] ? parseSheet(subjectRow[verticles[cleanSubjectRank]]) : 0;
      const newVoucherTotal = previousVoucherTotal + newVouchersCount;
      const date = new Date();
      const dateString = `${date.getUTCMonth()+1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
      const newCompleteVoucherTotal = subjectRow[verticles['Total Vouchers']] ? parseSheet(subjectRow[verticles['Total Vouchers']]) + newVouchersCount : newVouchersCount;
      const payout = newVouchersCount * voucherMoney[subjectRank];
      
      await updateSheet(collectionsSheet + `!${numberToEncodedLetter(verticles.collector+1)}${hori+1}`, newVouchers);
      await updateSheet(collectionsSheet + 
        `!${numberToEncodedLetter(verticles[cleanSubjectRank]+1)}${hori+1}`,
      newVoucherTotal);
      await updateSheet(collectionsSheet + `!${numberToEncodedLetter(verticles['Last Turn-in']+1)}${hori+1}`, dateString);

      let conformationString = `Added \`${newVouchersCount}\` vouchers to \`${subject}\` by <@${collectorId}>. Payout: $\`${payout}\``;
      conformationString += `\nNew total for \`${cleanSubjectRank}\`: \`${newVoucherTotal}\``;
      console.log(conformationString);
      //msg.channel.send(conformationString);
      const embed = new MessageEmbed({
        type: 'rich',
        title: `Vouchers received for ${subject}`,
        fields:[
          { name: 'Collector', value: `<@${collectorId}>`, inline: true },
          { name: 'Vouchers Taken', value: newVouchersCount, inline: true },
          { name: 'Payout', value: `$ ${payout}`, inline: true },
          { name: 'New total', value: newCompleteVoucherTotal, inline: true },
          //{ name: 'something', value: 'something else', inline: true }, placeholder
        ],
        image: { url: msg.author.avatarURL({ dynamic: true }) },
        footer: { text: 'Elfshot', iconURL: 'https://avatars.githubusercontent.com/u/44043197' }
      });
      embed.setTimestamp();
      msg.channel.send(embed);
      await discordLog(conformationString);
    }
    catch(err) {
      console.log(err);
      return msg.reply(err.message);
    }
  }
}
async function discordLog(msg: string): Promise<void> {
  try {
    await axios.post(WhLink, { content: msg, timeout: 5000 });
  } catch (err) {
    console.log(err);
    throw Error('Could not log to discord(not very important) <@&847275183114027028>');
  }
}
async function authorize(): Promise<Credentials | null> {
  try {
    const auth = await jwtClient.authorize();
    return auth.access_token ? auth : null;
  } catch(err) { 
    throw Error('Could not authenticate with Google Sheets');
  }
}
async function getSheet(): Promise<any[][] | null> {
  await authorize();
  const request = {
    spreadsheetId: spreadsheetId,
    range: collectionsSheet,
    auth: jwtClient,
  };
  try {
    const response = (await sheets.spreadsheets.values.get(request)).data;
    return response.values;
  } catch (err) {
    console.log(err);
    throw Error('Failed to get data from Google Sheets');
  }
}
async function updateSheet(range: string, replaceData: string | number,): Promise<Schema$UpdateValuesResponse> {
  await authorize();
  if (replaceData == 0) replaceData = '';
  const request = {
    spreadsheetId: spreadsheetId,  
    range: range, 
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [[replaceData]],
    },
    auth: jwtClient,
  };

  try {
    const response = (await sheets.spreadsheets.values.update(request)).data;
    return response;
  } catch (err) {
    console.log(err);
    throw Error('Failed to update collected vouchers (check the history and fix!)');
  }
}
function parseSheet(a: string):number {
  return parseInt(a.replace(/,/g, ''));
}