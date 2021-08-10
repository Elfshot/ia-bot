import { Command } from 'discord-akairo';
import { Message, MessageEmbed } from 'discord.js';
import { getSheet, updateSheet, parseSheet, ranks, categories, getVerts, getHori } from '../utils/sheets';
import { discordLog, addCommas } from '../utils/discord';
import { numberToEncodedLetter } from '../misc/numberToLetters';

const voucherMoney: ranks= {
  'Pilot': 9000,
  'Seasoned Pilot': 10500,
  'Seasoned Pilot FM': 11025,
  'Fleet Admiral': 12000,
  'Grand Moff': 13500,
};

const collectionsSheet = process.env.COLLECTIONSNAME;


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
      const date = new Date();
      const subjectId = args.userId;
      const collectorId = msg.author.id;
      const newVouchersCount = args.amount;

      //Initial setup and 
      if (!subjectId) return msg.reply('No user specified!');
      else if (!newVouchersCount) return msg.reply('No vouchers amount specified!');
      //else if (newVouchersCount < 10) return msg.reply('We don\'t take less than 10 vouchers :wink:');
      else if (newVouchersCount > 1000000) return msg.reply('no.');
      const originalSheet = await getSheet(collectionsSheet);
      
      const verticles: categories = getVerts(originalSheet, collectorId); 
      const hori = getHori(originalSheet, subjectId);

      if (verticles.collector === 0) return msg.reply(`Collector "<@${collectorId}>" not found!`);
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
      const month = date.getUTCMonth();
      const year = date.getUTCFullYear();
      const dateString = `${month +2 <= 12? month +2: '1'}/1/${month +1 !== 12? year: year +1}`;
      const newCompleteVoucherTotal = subjectRow[verticles['Total Vouchers']] ? parseSheet(subjectRow[verticles['Total Vouchers']]) + newVouchersCount : newVouchersCount;
      const payout = newVouchersCount * voucherMoney[subjectRank];
      
      // vouchers taken
      await updateSheet(collectionsSheet, `!${numberToEncodedLetter(verticles.collector+1)}${hori+1}`, [newVouchers === 0?'':newVouchers.toString()]);
      // total vouchers
      await updateSheet(collectionsSheet, `!${numberToEncodedLetter(verticles[cleanSubjectRank]+1)}${hori+1}`, [newVoucherTotal === 0?'':newVoucherTotal.toString()]);
      // date
      await updateSheet(collectionsSheet, `!${numberToEncodedLetter(verticles['Last Turn-in']+1)}${hori+1}`, [dateString]);

      let conformationString = `Added \`${newVouchersCount}\` vouchers to \`${subject}\` by <@${collectorId}>. Payout: $\`${payout}\``;
      conformationString += `\n New total for \`${cleanSubjectRank}\`: \`${newVoucherTotal}\`\n  New date: \`${dateString}\``;
      console.log(conformationString);
      
      const embed = new MessageEmbed({
        type: 'rich',
        title: `Vouchers received for ${subject}`,
        fields:[
          { name: 'Collector', value: `<@${collectorId}>`, inline: true },
          { name: 'Vouchers Taken', value: addCommas(newVouchersCount), inline: true },
          { name: 'Payout', value: `$${addCommas(payout)}\n(${payout})`, inline: true },
          { name: 'New total', value: addCommas(newCompleteVoucherTotal), inline: true },
          //{ name: 'something', value: 'something else', inline: true }, placeholder
        ],
        image: { url: msg.author.avatarURL({ dynamic: true }) },
        footer: { text: 'Elfshot', iconURL: 'https://avatars.githubusercontent.com/u/44043197' },
        timestamp: date,
      });

      msg.channel.send(embed);
      await discordLog(conformationString);
    }
    catch(err) {
      console.log(err);
      return msg.reply(err.message);
    }
  }
}