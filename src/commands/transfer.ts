import { Command } from 'discord-akairo';
import { Message, MessageEmbed } from 'discord.js';
import { getSheet, parseSheet, getVerts, updateSheet } from '../utils/sheets';
import { discordLog, addCommas } from '../utils/discord';
import { numberToEncodedLetter } from '../misc/numberToLetters';

const collectionsSheet = process.env.COLLECTIONSNAME;
const transferSheet = process.env.TRANSFERSNAME;


export default class TransferCommand extends Command {
  constructor() {
    super('transfer', {
      aliases: ['transfer'],
      description: '`?transfer [@collector or discordId]',
      args: [
        {
          id: 'subjectId',
          type: 'string',
          default: null,
        },
      ],
    });
  }  
  async exec(msg: Message,args: { subjectId: string }): Promise<Message> {
    try {
      const date = new Date();
      const subjectId = (/<@!([0-9]*)>/g).exec(args.subjectId)?.[1] || args.subjectId;
      const transferId = msg.author.id;

      if (!subjectId) return msg.reply('No user specified!');

      const originalCollectionsSheet:string[][] = await getSheet(collectionsSheet);
      const originalTransferSheet:string[][] = await getSheet(transferSheet);
      const subjectVertC = getVerts(originalCollectionsSheet, subjectId).collector;
    
      const replaceC = [2,0];
      const emptyReplaceArr = [];
      let oldTrade = [0,0];
      let trade:string[]|number[] = [0,0];
      let collectorName = '';
      let subjectName = '';
      let collectorColT = 0;
      let subjectHoriT = 0;
      let availRec = 0;
      //                                                            // <BLOCK> locate subject & collector on transfer
      originalTransferSheet[0].forEach((value, index) => {
        if (collectorColT > 0) return;
        if (value.includes(transferId)) { collectorColT = index; collectorName = (/(.*?)\n[1-9]+/g).exec(value)?.[1]; }
      });
      if (!collectorColT || !collectorName) return msg.reply('GM not found on Transfer.');
      
      let receiptSec = false;
      for (let i = 0; i <= originalTransferSheet.length -1; i++) {
        const row =  originalTransferSheet[i];
        let freshFind = false;
        if (row[0].includes(subjectId)) { subjectHoriT = i; subjectName = (/(.*?)\n[1-9]+/g).exec(row[0])?.[1]; freshFind = true; }
        if (freshFind) { oldTrade = [parseSheet(row[collectorColT]),parseSheet(row[collectorColT+1])]; }
        if (row[0].includes('Receipts')) receiptSec = true;
        if (receiptSec) {
          if(!row[0] && availRec === 0) { 
            availRec = i;
            break;
          }
        }
      }
      if (!subjectHoriT || !subjectName) return msg.reply('FA not found on Transfer.');
      if (availRec === 0) return msg.reply('Could not find a row for the receipt');
      //                                                                  // </BLOCK>
      //                                                                  // <BLOCK> get values from collections sheet
      if (subjectVertC === 0) return msg.reply('FA not found on Collections.');
      for (let i = 0; i <= originalCollectionsSheet.length -1; i++) {
        const row = originalCollectionsSheet[i];
        if (row[0].includes('No longer in company')) { replaceC[1] = i -1; break; }

        if(parseSheet(row[subjectVertC]) !== 0) {
          trade[0] += parseSheet(row[subjectVertC]);
          trade[1] += parseSheet(row[subjectVertC + 2]);
        }
      }
      const totalTable = [(trade[0] + oldTrade[0]).toString(), (trade[1] + oldTrade[1]).toString()];
      trade = trade.map((v,) => v.toString());
      for (let i = 0; i < replaceC[1] - replaceC[0]; i++) emptyReplaceArr[i] = '';
      const receipt = [subjectName, collectorName, trade[0], trade[1], date.toUTCString()];
      //                                                                  // <BLOCK>

      await updateSheet(collectionsSheet, `!${numberToEncodedLetter(subjectVertC+1)}${replaceC[0]+1
      }:${numberToEncodedLetter(subjectVertC+1)}${replaceC[1]+1}`, emptyReplaceArr, 'COLUMNS');
      
      await updateSheet(transferSheet, `!${numberToEncodedLetter(collectorColT+1)}${subjectHoriT+1
      }:${numberToEncodedLetter(collectorColT+2)}${subjectHoriT+1}`, totalTable);

      await updateSheet(transferSheet, `!A${availRec+1}:E${availRec+1}`, receipt);

      let conformationString = `Transfered \`${trade[0]}\` vouchers from <@${subjectId}> by <@${transferId}>. Payout: $\`${trade[1]}\``;
      conformationString += `\n New total for <@${subjectId}> by <@${transferId}>: \`${totalTable[0]}\`\n  Date: \`${date.toUTCString()}\``;
      console.log(conformationString);

      const embed = new MessageEmbed({
        type: 'rich',
        title: `Vouchers transfered from ${subjectName}`,
        fields:[
          { name: 'GM Collector', value: `<@${transferId}>`, inline: true },
          { name: 'Vouchers Taken', value: addCommas(trade[0]), inline: true },
          { name: 'Payout', value: `$${addCommas(trade[1])}\n(${trade[1]})`, inline: true },
          { name: `New total from ${subjectName}`, value: `${addCommas(totalTable[0])} ($${addCommas(totalTable[1])})`, inline: true },
          //{ name: 'something', value: 'something else', inline: true }, placeholder
        ],
        image: { url: msg.author.avatarURL({ dynamic: true }) },
        footer: { text: 'Elfshot', iconURL: 'https://avatars.githubusercontent.com/u/44043197' },
        timestamp: date,
      });
      
      await discordLog(conformationString);
      await msg.channel.send(embed);
    }
    catch(err) {
      console.log(err);
      return msg.reply(err);
    }
  }
}