const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const FOLDER_ID = '16um1W7h5H0XvpFxoxctv4-CUkCHpFLVq';
const KEY_FILE = path.join(__dirname, '..', 'gdrive-key.json');
const APK_FILE = path.join(__dirname, '..', 'mobile', 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk');

if (!fs.existsSync(KEY_FILE)) {
  console.error('Nøkkelfil mangler:', KEY_FILE);
  process.exit(1);
}

const key = JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));

function base64Url(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedClaim = base64Url(JSON.stringify(claim));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const signature = signer.sign(key.private_key, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${signatureInput}.${signature}`;

  return new Promise((resolve, reject) => {
    const postData = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.access_token) {
            resolve(data.access_token);
          } else {
            reject(new Error('Kunne ikke hente access token: ' + body));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function checkFolderAccess(accessToken) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'www.googleapis.com',
      path: `/drive/v3/files/${FOLDER_ID}?supportsAllDrives=true&fields=id,name`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        resolve(res.statusCode === 200);
      });
    });
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function uploadApk() {
  console.log('Autentiserer Service Account: drive-uploader@tillit-scanner-hanselaa.iam.gserviceaccount.com');
  const accessToken = await getAccessToken();

  console.log('Sjekker tilgang til Google Disk-mappen...');
  const hasAccess = await checkFolderAccess(accessToken);
  if (!hasAccess) {
    console.log('\n======================================================');
    console.log('⚠️ SERVICE ACCOUNT HAR IKKE TILGANG TIL MAPPEN ENNÅ!');
    console.log('For at roboten skal kunne laste opp filen direkte til mappen din:');
    console.log('1. Åpne mappen i nettleseren: https://drive.google.com/drive/folders/' + FOLDER_ID);
    console.log('2. Trykk "Del" (Share)');
    console.log('3. Legg til e-posten:');
    console.log('   drive-uploader@tillit-scanner-hanselaa.iam.gserviceaccount.com');
    console.log('   (Sett som "Redaktør" / "Editor")');
    console.log('======================================================\n');
    return;
  }

  console.log('✅ Tilgang bekreftet! Laster inn APK-fil...');
  const fileBuffer = fs.readFileSync(APK_FILE);
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: 'ScanSafe-Tillit.apk',
    mimeType: 'application/vnd.android.package-archive',
    parents: [FOLDER_ID]
  };

  const multipartRequestBody = Buffer.concat([
    Buffer.from(delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + delimiter + 'Content-Type: application/vnd.android.package-archive\r\n\r\n'),
    fileBuffer,
    Buffer.from(closeDelimiter)
  ]);

  console.log(`Laster opp ScanSafe-Tillit.apk (${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB) til Google Disk...`);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.googleapis.com',
      path: '/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': multipartRequestBody.length
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('🎉 OPPLASTING VELLYKKET!');
            console.log('Fil-ID:', result.id);
            console.log('Filnavn:', result.name);
            resolve(result);
          } else {
            console.error('Feil fra Google Drive API:', body);
            reject(new Error(body));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(multipartRequestBody);
    req.end();
  });
}

uploadApk().catch(err => {
  console.error('Feil:', err.message);
  process.exit(1);
});
