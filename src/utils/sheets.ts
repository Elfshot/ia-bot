import { google } from 'googleapis';
import { Credentials } from 'google-auth-library';

const spreadsheetId = process.env.GOOGLESHEETID;
const sheets = google.sheets('v4');
const privatekey = JSON.parse(process.env.GOOGLECREDS);
const jwtClient = new google.auth.JWT(
  privatekey.client_email,
  null,
  privatekey.private_key,
  ['https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/calendar']
);

export async function authorize(): Promise<Credentials | null> {
  try {
    const auth = await jwtClient.authorize();
    return auth.access_token ? auth : null;
  } catch(err) { 
    throw Error('Could not authenticate with Google Sheets');
  }
}
export async function getSheet(sheet: string): Promise<any[][] | null> {
  await authorize();
  const request = {
    spreadsheetId,
    range: sheet,
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

export async function updateSheet(sheet: string, range: string, replaceData: string[]|string[][], dim?:'ROWS'|'COLUMNS'): Promise<Schema$UpdateValuesResponse> {
  dim = dim || 'ROWS';
  await authorize();
  const request = {
    spreadsheetId,  
    range: sheet + range, 
    valueInputOption: 'USER_ENTERED',
    resource: {
      majorDimension: dim,
      values: [replaceData],
    },
    auth: jwtClient,
  };

  try {
    const response = (await sheets.spreadsheets.values.update(request)).data;
    return response;
  } catch (err) {
    console.log(err);
    throw Error(`Failed to update collected vouchers (${sheet + range})`);
  }
}
export function parseSheet(a: string):number {
  return parseInt(a?.replace(/,/g, '')?.replace(/\$/g, '')) || 0;
}
export function getVerts(sheet: any[][], collectorId?: string): categories {
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

  for (let i = 0; i < sheet[0].length; i++) {
    const current = sheet[0][i];
    
    if (collectorId && current.includes(collectorId)) {
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
  return verticles;
}
export function getHori(sheet: any[][], subjectId: string): number {
  let hori = 0;
  for (let i = 0; i < sheet.length; i++) {
    const current = sheet[i][1];
    if (current.includes('No longer in company')) break;
    if (current.includes(`${subjectId}`)) {
      hori = i;
      break;
    }
  }
  if (hori === 0) { throw Error(`Unable to find subject: ${subjectId}`); }
  return hori;
}

export interface ranks {
  Pilot: number;
  'Seasoned Pilot': number;
  'Seasoned Pilot FM'?: number,
  'Fleet Admiral': number;
  'Grand Moff': number;
}
export interface categories {
  collector?: number;
  Pilot: number;
  'Seasoned Pilot': number;
  'Seasoned Pilot FM'?: number,
  'Fleet Admiral': number;
  'Grand Moff': number;
  'Last Turn-in': number;
  'Total Vouchers': number;
}
export interface Schema$ValueRange {
  majorDimension?: string | null;
  range?: string | null;
  values?: any[][] | null;
}
export interface Schema$UpdateValuesResponse {
  spreadsheetId?: string | null;
  updatedCells?: number | null;
  updatedColumns?: number | null;
  updatedData?: Schema$ValueRange;
  updatedRange?: string | null;
  updatedRows?: number | null;
}