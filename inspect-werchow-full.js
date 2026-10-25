const { google } = require('googleapis');
const { sheetsAuth, driveAuth } = require('/root/clientes/san-jorge/oauth-drive.js');
const SPREADSHEET_ID = '11FC4UKZGh3-2SoQHmenUeB2l-oGtEjQ0zFjXjYTG7og';

(async () => {
  const auth = sheetsAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  async function getCol(range) {
    const r = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
    return (r.data.values || []).flat();
  }

  const tipoConsulta = await getCol("Leads!E2:E");
  const temp = await getCol("Leads!F2:F");
  const esSocio = await getCol("Leads!G2:G");
  const enviarCamp = await getCol("Leads!K2:K");
  console.log('Tipo_Consulta distinct:', [...new Set(tipoConsulta)]);
  console.log('Temperatura distinct:', [...new Set(temp)]);
  console.log('Es_Socio distinct:', [...new Set(esSocio)]);
  console.log('Enviar_Campana distinct:', [...new Set(enviarCamp)]);

  const estadoAses = await getCol("Leads_Asesoramiento!J2:J");
  const catAses = await getCol("Leads_Asesoramiento!L2:L");
  console.log('Ases Estado distinct:', [...new Set(estadoAses)]);
  console.log('Ases Categoria distinct:', [...new Set(catAses)]);

  const estadoEmerg = await getCol("Leads_Emergencia_Sepelio!G2:G");
  console.log('Emerg Estado distinct:', [...new Set(estadoEmerg)]);

  const estadoInt = await getCol("Leads_Sepelio_Interes!F2:F");
  const ventasInt = await getCol("Leads_Sepelio_Interes!G2:G");
  console.log('Interes Estado distinct:', [...new Set(estadoInt)]);
  console.log('Interes En_Ventas distinct:', [...new Set(ventasInt)]);

  // Resumen mensual full A:F
  const resumen = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: "'Resumen Mensual'!A3:F30" });
  console.log('Resumen Mensual rows:', JSON.stringify(resumen.data.values));

  // row counts
  for (const t of ['Leads','Leads_Asesoramiento','Leads_Emergencia_Sepelio','Leads_Sepelio_Interes']) {
    const r = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${t}!A:A` });
    console.log(t, 'rows =', (r.data.values||[]).length);
  }

  // sharing permissions
  const drive = google.drive({ version: 'v3', auth: driveAuth() });
  const perms = await drive.permissions.list({ fileId: SPREADSHEET_ID, fields: 'permissions(id,type,role,emailAddress)' });
  console.log('Permissions:', JSON.stringify(perms.data.permissions));
})().catch(e=>console.error('ERR',e.message));
