import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import { google } from 'googleapis';
import { numberToEncodedLetter } from '../misc/numberToLetters';

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
const voucherMoney = {
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
}
export default class TurnInCommand extends Command {
  constructor() {
    super('turnin', {
      aliases: ['turnin'],
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
      ]
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
      };

      //Initial setup and auth
      if (!subjectId) return msg.reply('No user specified!');
      else if (!newVouchersCount) return msg.reply('No vouchers amount specified!');
      else if (newVouchersCount < 10) return msg.reply('We don\'t take less than 10 vouchers :wink:');
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
          case 'Last Turn-in':
            verticles['Last Turn-in'] = i;
            break;
          }

        }
        if (current.includes('Last Turn-in')) break;
      }

      for (let i = 0; i < originalSheet.length; i++) {
        const current = originalSheet[i][0];
        if (current.includes('No longer in company')) break;
        if (current.includes(` - ${subjectId}`)) { //TODO - change the sheet and here to just get the id from another cell for security reasons
          hori = i;
          break;
        }
      }
      if (verticles.collector === 0) return msg.reply(`Collector "<@${collectorId}>" not found!`);
      else if (hori === 0) return msg.reply(`User "${subjectId}" cannot be found.`);
      else if (verticles['Last Turn-in'] === 0 || verticles['Pilot'] === 0 || verticles['Grand Moff'] === 0) return msg.reply('Nope, the sheet changed... in a bad way');
      
      const subject = originalSheet[hori][0];
      const previousVouchers = originalSheet[hori][verticles.collector] ? parseInt(originalSheet[hori][verticles.collector]) : 0;
      const newVouchers = previousVouchers + newVouchersCount;
      const subjectRank:keyof(ranks) = originalSheet[hori][1];
      const cleanSubjectRank:keyof(ranks) = subjectRank == 'Seasoned Pilot FM'? 'Seasoned Pilot': subjectRank;
      const previousVoucherTotal = originalSheet[hori][verticles[cleanSubjectRank]] ? parseInt(originalSheet[hori][verticles[cleanSubjectRank]]) : 0;
      const newVoucherTotal = previousVoucherTotal + newVouchersCount;
      const date = new Date();
      const dateString = `${date.getUTCMonth()+1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;

      await updateSheet(collectionsSheet + `!${numberToEncodedLetter(verticles.collector+1)}${hori+1}`, newVouchers);
      await updateSheet(collectionsSheet + 
        `!${numberToEncodedLetter(verticles[cleanSubjectRank]+1)}${hori+1}`,
      newVoucherTotal);
      await updateSheet(collectionsSheet + `!${numberToEncodedLetter(verticles['Last Turn-in']+1)}${hori+1}`, dateString);

      let conformationString = `Added \`${newVouchersCount}\` vouchers to \`${subject}\` by <@${collectorId}>. Payout: $\`${newVouchersCount * voucherMoney[subjectRank]}\``;
      conformationString += `\nNew total for \`${cleanSubjectRank}\`: \`${newVoucherTotal}\``;
      console.log(conformationString);
      msg.channel.send(conformationString);
      
    }
    catch(err) {
      console.log(err);
      return msg.reply(err.message);
    }
  }
}
async function authorize(): Promise<any> {
  try {
    const auth = await jwtClient.authorize();
    return auth.access_token ? auth : false;
  } catch(err) { 
    throw Error('Could not authenticate with Google Sheets');
  }
}
async function getSheet(): Promise<any> {
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
async function updateSheet(range: string, replaceData: string | number,): Promise<any> {
  await authorize();
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
    throw Error('Failed to update collected vouchers');
  }
}