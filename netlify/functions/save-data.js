// Netlify Function: /.netlify/functions/save-data
import fetch from 'node-fetch';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200 };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { site, home } = JSON.parse(event.body || '{}');
  if (!site && !home) return { statusCode: 400, body: 'No data' };

  const owner='MadMhessel', repo='portfolio', branch='main';
  const token = process.env.GITHUB_TOKEN;
  const gh = (p, opt={}) => fetch(`https://api.github.com${p}`, {
    ...opt, headers:{ 'Accept':'application/vnd.github+json', 'Authorization':`token ${token}`, ...(opt.headers||{}) }
  });

  async function put(file, obj){
    const get = await gh(`/repos/${owner}/${repo}/contents/${file}?ref=${branch}`);
    if (!get.ok) throw new Error('read '+file);
    const { sha } = await get.json();
    const body = { message:`chore(editor): update ${file}`, content: Buffer.from(JSON.stringify(obj, null, 2)).toString('base64'), sha, branch };
    const res = await gh(`/repos/${owner}/${repo}/contents/${file}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if (!res.ok) throw new Error('write '+file);
  }

  try{
    if (site) await put('data/site.json', site);
    if (home) await put('data/home.json', home);
    return { statusCode: 200, body: 'OK' };
  }catch(e){
    return { statusCode: 500, body: e.message };
  }
};
