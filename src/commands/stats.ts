import { Command } from 'discord-akairo';
import { Message, MessageEmbed } from 'discord.js';
import { getSheet, parseSheet, ranks, categories, getVerts, getHori } from '../utils/sheets';

export default class StatsCommand extends Command {
  constructor() {
    super('stats', {
      aliases: ['stats'],
      description: '`?stats [in-game id]',
      args: [
        {
          id: 'userId',
          type: 'string',
          default: null,
        },
      ],
    });
  }  
  async exec(msg: Message,args: { userId: string, amount: number }): Promise<Message> {
    try {
      const date = new Date();
      const subjectId = args.userId;
      const collectorId = msg.author.id;

      //Initial setup and 
      if (!subjectId) return msg.reply('No user specified!');
      const originalSheet = await getSheet();
      
      const verticles: categories = getVerts(originalSheet, collectorId); 
      const hori = getHori(originalSheet, subjectId);

      if (verticles['Last Turn-in'] === 0 || verticles['Pilot'] === 0 || verticles['Grand Moff'] === 0 || verticles['Total Vouchers'] === 0) return msg.reply('Nope, the sheet changed... in a bad way');
      
      const subjectRow:any[] | string[] = originalSheet[hori];
      const subject:string = subjectRow[0];
      const subjectRank:keyof(ranks) = subjectRow[2];
      
      if (subjectRank.includes('CEO')) return msg.reply('Cannot add vouchers to CEO ranks');
      if (!subjectRank) return msg.reply('User has no rank');
      const vouchers = [parseSheet(subjectRow[verticles.Pilot]), parseSheet(subjectRow[verticles['Seasoned Pilot']]), 
        parseSheet(subjectRow[verticles['Fleet Admiral']]), parseSheet(subjectRow[verticles['Grand Moff']])]; 
      const vouchersTotal = vouchers.reduce((a, b) => a + b);
      const embed = new MessageEmbed({
        type: 'rich',
        title: `Vouchers stats for ${subject} - ${subjectRank}`,
        fields:[
          { name: 'Pilot', value: vouchers[0], inline: true },
          { name: 'Seasoned Pilot', value: vouchers[1], inline: true },
          { name: 'Fleet Admiral', value: vouchers[2], inline: true },
          { name: 'Grand Moff', value: vouchers[3], inline: true },
          { name: 'Total', value: vouchersTotal }
          //{ name: 'something', value: 'something else', inline: true }, placeholder
        ],
        image: { url: msg.author.avatarURL({ dynamic: true }) },
        footer: { text: 'Elfshot', iconURL: 'https://avatars.githubusercontent.com/u/44043197' },
        timestamp: date,
      });

      msg.channel.send(embed);
    }
    catch(err) {
      console.log(err);
      return msg.reply(err.message);
    }
  }
}