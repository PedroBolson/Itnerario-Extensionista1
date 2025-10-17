/***** ================= CONFIG / SCHEMA ================= *****/

function cfg(k){ return PropertiesService.getScriptProperties().getProperty(k) || ''; }
const ORIGIN  = () => cfg('ALLOWED_ORIGIN');
const API_SECRET = () => cfg('API_SECRET');
const RECAPTCHA_SECRET = () => cfg('RECAPTCHA_SECRET');

const SCHEMA = {
  users: {
    key: 'uid',
    headers: ['uid','email','fullName','role','isActive','passwordHash','createdAt','updatedAt'],
    validators: {
      uid: s => str(s, 128),
      email: s => str((s||'').toLowerCase(), 256),
      fullName: s => str(s, 256),
      role: s => (String(s) === 'admin' ? 'admin' : 'user'), // só admin/user
      isActive: v => bool(v),
      passwordHash: s => str(s, 512),
      createdAt: d => dateOrNow(d),
      updatedAt: d => dateOrNow(d),
    }
  },
  topics: {
    key: 'id',
    headers: ['id','name','category','color','order','coverImageUrl','coverImageAlt','createdAt','updatedAt'],
    validators: {
      id: s => str(s, 128),
      name: s => str(s, 128),
      category: s => str(s, 64),
      color: s => str(s, 32),
      order: n => int(n),
      coverImageUrl: s => str(s, 512),
      coverImageAlt: s => str(s, 256),
      createdAt: d => dateOrNow(d),
      updatedAt: d => dateOrNow(d),
    }
  },
  contents: {
    key: 'id',
    headers: ['id','topicId','title','description','order','coverImageUrl','coverImageAlt','difficulty','createdAt','updatedAt'],
    validators: {
      id: s => str(s, 128),
      topicId: s => str(s, 128),
      title: s => str(s, 256),
      description: s => str(s, 4000),
      order: n => int(n),
      coverImageUrl: s => str(s, 512),
      coverImageAlt: s => str(s, 256),
      difficulty: s => str(s, 32),
      createdAt: d => dateOrNow(d),
      updatedAt: d => dateOrNow(d),
    }
  },
  lessons: {
    key: 'id',
    headers: ['id','contentId','title','youtubeUrl','order','description','createdAt','updatedAt'],
    validators: {
      id: s => str(s, 128),
      contentId: s => str(s, 128),
      title: s => str(s, 256),
      youtubeUrl: s => str(s, 512),
      order: n => int(n),
      description: s => str(s, 4000),
      createdAt: d => dateOrNow(d),
      updatedAt: d => dateOrNow(d),
    }
  },
  participants: {
    key: 'code',
    headers: ['code','displayName','createdAt','lastActiveAt','lessonProgress'],
    validators: {
      code: s => str(s, 128),
      displayName: s => str(s, 256),
      createdAt: d => dateOrNow(d),
      lastActiveAt: d => dateOrNow(d),
      lessonProgress: v => jsonText(v, 100000),
    }
  }
};

/***** ================= ENTRYPOINTS / CORS ================= *****/

function doOptions(e){ 
  return buildResponse({ ok:true }, 200); 
}

function doGet(e){
  if (!validateApiSecret(e)) return buildResponse({ ok:false, error:'forbidden' }, 403);
  const p = e.parameter || {};
  const action = (p.action || 'dump').toLowerCase();
  const actor = getActorFromRequest(e, null);

  try {
    if (action === 'nonce') return buildResponse({ ok:true, nonce: newNonce() }, 200);

    if (action === 'dump') {
      const out = {};
      Object.keys(SCHEMA).forEach(name => {
        let rows = readAll(name);
        if (name === 'users') rows = sanitizeUsers(rows);
        out[name] = rows;
      });
      return buildResponse({ ok:true, data: out }, 200);
    }

    if (action === 'list') {
      const table = p.table;
      if (!SCHEMA[table]) return buildResponse({ ok:false, error:'unknown_table' }, 400);
      const { rows } = readTable(table);
      const limit  = Math.min(parseInt(p.limit || '100', 10), 1000);
      const offset = Math.max(parseInt(p.offset || '0', 10), 0);
      let filtered = rows;
      if (p.field && typeof p.eq !== 'undefined') {
        filtered = rows.filter(r => String(r[p.field] ?? '') === String(p.eq));
      }
      if (table === 'users') filtered = sanitizeUsers(filtered);
      return buildResponse({ ok:true, total: filtered.length, data: filtered.slice(offset, offset + limit) }, 200);
    }

    if (action === 'get') {
      const table = p.table, id = p.id;
      if (!SCHEMA[table]) return buildResponse({ ok:false, error:'unknown_table' }, 400);
      if (!id) return buildResponse({ ok:false, error:'missing_id' }, 400);
      let rec = getById(table, id);
      if (!rec) return buildResponse({ ok:false, error:'not_found' }, 404);
      if (table === 'users') rec = sanitizeUser(rec);
      return buildResponse({ ok:true, data: rec }, 200);
    }

    return buildResponse({ ok:false, error:'unknown_action' }, 400);
  } catch (err) {
    return buildResponse({ ok:false, error:String(err) }, 500);
  }
}

function doPost(e){
  if (!validateApiSecret(e)) return buildResponse({ ok:false, error:'forbidden' }, 403);

  let body = {};
  try { body = JSON.parse(e.postData?.contents || '{}'); }
  catch { return buildResponse({ ok:false, error:'invalid_json' }, 400); }

  const action = String(body.action || '').toLowerCase();
  if (!action) return buildResponse({ ok:false, error:'missing_action' }, 400);

  // reCAPTCHA opcional
  if (requiresCaptcha(action) && RECAPTCHA_SECRET() && !verifyRecaptcha(body.recaptcha)) {
    return buildResponse({ ok:false, error:'captcha' }, 403);
  }

  // rate limit por sessão/IP
  const key = (body.sessionToken && String(body.sessionToken).slice(0,64)) || getClientIp(e);
  if (hitLimit('rl:'+key, 300)) return buildResponse({ ok:false, error:'rate_limited' }, 429);

  // Auth
  if (action === 'auth_login')   return handleAuthLogin(body);
  if (action === 'auth_logout')  return handleAuthLogout(body);
  if (action === 'auth_change_password') return handleAuthChangePassword(body, e);

  // Nonce (reforço para escrita)
  // Exceção: participants com create/batch_upsert não precisa de nonce (criação pública)
  const table = body.table;
  const needsNonce = requiresNonce(action) && !(table === 'participants' && (action === 'create' || action === 'batch_upsert'));
  if (needsNonce && !consumeNonce(String(body.nonce||''))) {
    return buildResponse({ ok:false, error:'bad_nonce' }, 403);
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return buildResponse({ ok:false, error:'busy' }, 503);

  try {
    switch (action) {
      case 'create':        return handleCreate(body, e);
      case 'update':        return handleUpdate(body, e);
      case 'upsert':        return handleUpsert(body, e);
      case 'delete':        return handleDelete(body, e);
      case 'batch_upsert':  return handleBatchUpsert(body, e);
      default:              return buildResponse({ ok:false, error:'unknown_action' }, 400);
    }
  } catch (err) {
    return buildResponse({ ok:false, error:String(err) }, 500);
  } finally {
    try { lock.releaseLock(); } catch (_){}
  }
}

/***** ================= AUTH (sessão opaca, sem JWT) ================= *****/

const SESSION_TTL_SEC = 8 * 60 * 60; // 8h

function makeToken(){ return Utilities.getUuid(); }
function sessionKey(tok){ return 'sess:'+tok; }

function createSession(user){ // {uid, role, email, fullName}
  const tok = makeToken();
  const now = Date.now();
  const data = { uid:user.uid, role:user.role||'user', email:user.email||'', fullName:user.fullName||'', iat:now, exp: now + SESSION_TTL_SEC*1000 };
  PropertiesService.getScriptProperties().setProperty(sessionKey(tok), JSON.stringify(data));
  return { token: tok, actor: data };
}
function getSession(tok){
  if (!tok) return null;
  const raw = PropertiesService.getScriptProperties().getProperty(sessionKey(tok));
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (Date.now() > s.exp) { deleteSession(tok); return null; }
    return s;
  } catch { return null; }
}
function deleteSession(tok){
  if (!tok) return;
  PropertiesService.getScriptProperties().deleteProperty(sessionKey(tok));
}

function getActorFromRequest(e, body){
  const hdr = e?.headers || {};
  const tok = (hdr['x-session-token'] || hdr['X-Session-Token'] || (body && body.sessionToken) || '').trim();
  return getSession(tok); // {uid, role, ...} | null
}

function handleAuthLogin(body){
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) return buildResponse({ ok:false, error:'missing_credentials' }, 400);

  const u = findUserByEmail(email);
  if (!u || !bool(u.isActive)) return buildResponse({ ok:false, error:'invalid_user' }, 401);
  if (!verifyHash(password, u.passwordHash)) return buildResponse({ ok:false, error:'invalid_password' }, 401);

  const { token, actor } = createSession({ uid:u.uid, role:u.role, email:u.email, fullName:u.fullName });
  const safeActor = { uid: actor.uid, role: actor.role, email: actor.email, fullName: actor.fullName, exp: actor.exp };
  return buildResponse({ ok:true, token, actor: safeActor }, 200);
}
function handleAuthLogout(body){
  deleteSession(String(body.sessionToken || ''));
  return buildResponse({ ok:true }, 200);
}
function handleAuthChangePassword(body, e){
  const actor = getActorFromRequest(e, body);
  if (!actor) return buildResponse({ ok:false, error:'unauthenticated' }, 401);
  const oldp = String(body.oldPassword || '');
  const newp = String(body.newPassword || '');
  if (newp.length < 6) return buildResponse({ ok:false, error:'weak_password' }, 400);

  const u = getById('users', actor.uid);
  if (!u || !verifyHash(oldp, u.passwordHash)) return buildResponse({ ok:false, error:'invalid_old_password' }, 401);

  const { sheet, headers } = getSheetAndHeaders('users');
  const idx = findRowByKey(sheet, headers, 'uid', actor.uid);
  writeRow(sheet, headers, idx, { ...u, passwordHash: encodeHash(newp), updatedAt: nowStr() });
  return buildResponse({ ok:true }, 200);
}

// hashing simples (HMAC-SHA256 com salt aleatório)
function makeSalt(){ return Utilities.base64Encode(Utilities.getUuid().slice(0,16)); }
function hmac(password, saltB64){
  // Usa o salt como chave diretamente (string)
  const sig = Utilities.computeHmacSha256Signature(password, saltB64);
  return Utilities.base64Encode(sig);
}
function encodeHash(password){
  const salt = makeSalt();
  return 's:'+salt+'$h:'+hmac(password, salt);
}
function verifyHash(password, passwordHash){
  const m = /^s:([^$]+)\$h:(.+)$/.exec(String(passwordHash||''));
  if (!m) return false;
  const salt = m[1], hash = m[2];
  return hmac(password, salt) === hash;
}
function findUserByEmail(email){
  const { rows } = readTable('users');
  const e = String(email || '').trim().toLowerCase();
  return rows.find(r => String(r.email||'').toLowerCase() === e);
}

/***** ================= RBAC SIMPLES (admin/user) ================= *****/

function isSelf(actor, userId){ return actor && actor.uid && String(actor.uid) === String(userId); }

function authorizeWrite(e, body){
  const actor = getActorFromRequest(e, body);
  const table = body.table;
  const action = body.action;
  
  // EXCEÇÃO: Participants com create/batch_upsert não precisa de autenticação
  if (table === 'participants' && (action === 'create' || action === 'batch_upsert')) {
    return { ok:true, actor: null };
  }
  
  if (!actor) return { ok:false, error:'unauthenticated' };
  if (!SCHEMA[table]) return { ok:false, error:'unknown_table' };

  // USERS:
  // - admin: cria/edita/deleta/ upsert
  // - user: só pode update da PRÓPRIA senha
  if (table === 'users') {
    const action = body.action;
    if (action === 'update') {
      const id = body.id;
      const isAdmin = actor.role === 'admin';
      const self = isSelf(actor, id);
      if (!isAdmin && !self) return { ok:false, error:'forbidden_users_update' };

      if (!isAdmin) {
        const patch = body.patch || {};
        const allowed = ['passwordHash']; // updatedAt será setado pelo servidor
        const extra = Object.keys(patch).filter(k => !allowed.includes(k));
        if (extra.length) return { ok:false, error:'forbidden_users_self_only_password' };
      }
      return { ok:true, actor };
    }
    if (['create','upsert','batch_upsert','delete'].includes(action)) {
      if (actor.role !== 'admin') return { ok:false, error:'forbidden_users_admin_only' };
      return { ok:true, actor };
    }
    return { ok:false, error:'unknown_users_action' };
  }

  // TOPICS / CONTENTS / LESSONS: qualquer usuário logado pode escrever
  if (table === 'topics' || table === 'contents' || table === 'lessons') return { ok:true, actor };

  // PARTICIPANTS: permite criação pública (create/upsert), mas read/update/delete exige autenticação
  if (table === 'participants') {
    // Permite criar novos participantes sem autenticação (para códigos de rastreio públicos)
    if (action === 'create' || action === 'batch_upsert') return { ok:true, actor: null };
    // Outras operações exigem autenticação
    return { ok:true, actor };
  }

  return { ok:false, error:'rule_not_defined' };
}

/***** ================= CRUD ================= *****/

function handleCreate(body, e){
  const auth = authorizeWrite(e, body);
  if (!auth.ok) return buildResponse(auth, 403);
  const table = body.table;
  const schema = SCHEMA[table];
  const rec = validateRecord(table, body.record || {});
  if (!rec[schema.key]) return buildResponse({ ok:false, error:'missing_primary_key' }, 400);

  if (table === 'users') {
    if (rec.password) { rec.passwordHash = encodeHash(String(rec.password)); delete rec.password; }
    if (!rec.passwordHash) return buildResponse({ ok:false, error:'missing_password_or_hash' }, 400);
    if (rec.role !== 'admin') rec.role = 'user';
    if (rec.isActive === undefined) rec.isActive = true;
  }

  const { sheet, headers } = getSheetAndHeaders(table);
  const idx = findRowByKey(sheet, headers, schema.key, rec[schema.key]);
  if (idx > 0) return buildResponse({ ok:false, error:'already_exists' }, 409);

  if (headers.includes('createdAt') && !rec.createdAt) rec.createdAt = nowStr();
  if (headers.includes('updatedAt')) rec.updatedAt = nowStr();
  appendRow(sheet, headers, rec);

  return buildResponse({ ok:true, data: table==='users'? sanitizeUser(rec): rec }, 201);
}

function handleUpsert(body, e){
  const auth = authorizeWrite(e, body);
  if (!auth.ok) return buildResponse(auth, 403);
  const table = body.table;
  const schema = SCHEMA[table];
  const rec = validateRecord(table, body.record || {});
  if (!rec[schema.key]) return buildResponse({ ok:false, error:'missing_primary_key' }, 400);

  if (table === 'users') {
    if (rec.password) { rec.passwordHash = encodeHash(String(rec.password)); delete rec.password; }
    if (rec.role !== 'admin') rec.role = 'user';
  }

  const { sheet, headers } = getSheetAndHeaders(table);
  const idx = findRowByKey(sheet, headers, schema.key, rec[schema.key]);
  if (idx > 0) {
    if (headers.includes('updatedAt')) rec.updatedAt = nowStr();
    const merged = { ...getRowObject(sheet, headers, idx), ...rec };
    writeRow(sheet, headers, idx, merged);
    return buildResponse({ ok:true, upsert:'updated', data: table==='users'? sanitizeUser(merged): merged }, 200);
  } else {
    if (headers.includes('createdAt') && !rec.createdAt) rec.createdAt = nowStr();
    if (headers.includes('updatedAt')) rec.updatedAt = nowStr();
    appendRow(sheet, headers, rec);
    return buildResponse({ ok:true, upsert:'created', data: table==='users'? sanitizeUser(rec): rec }, 201);
  }
}

function handleUpdate(body, e){
  const auth = authorizeWrite(e, body);
  if (!auth.ok) return buildResponse(auth, 403);
  const table = body.table;
  const schema = SCHEMA[table];
  const id = body.id;
  const patch = validatePatch(table, body.patch || {});
  if (!id) return buildResponse({ ok:false, error:'missing_id' }, 400);

  if (table === 'users' && patch.password) {
    patch.passwordHash = encodeHash(String(patch.password));
    delete patch.password;
  }

  const { sheet, headers } = getSheetAndHeaders(table);
  const idx = findRowByKey(sheet, headers, schema.key, id);
  if (idx <= 0) return buildResponse({ ok:false, error:'not_found' }, 404);

  const current = getRowObject(sheet, headers, idx);
  if (headers.includes('updatedAt')) patch.updatedAt = nowStr();
  const merged = { ...current, ...patch };
  writeRow(sheet, headers, idx, merged);

  return buildResponse({ ok:true, data: table==='users'? sanitizeUser(merged): merged }, 200);
}

function handleDelete(body, e){
  const auth = authorizeWrite(e, body);
  if (!auth.ok) return buildResponse(auth, 403);
  const table = body.table;
  const schema = SCHEMA[table];
  const id = body.id;
  if (!id) return buildResponse({ ok:false, error:'missing_id' }, 400);

  const { sheet, headers } = getSheetAndHeaders(table);
  const idx = findRowByKey(sheet, headers, schema.key, id);
  if (idx <= 0) return buildResponse({ ok:false, error:'not_found' }, 404);

  if (table === 'users' && headers.includes('isActive') && !body.hard) {
    const current = getRowObject(sheet, headers, idx);
    current.isActive = false;
    if (headers.includes('updatedAt')) current.updatedAt = nowStr();
    writeRow(sheet, headers, idx, current);
    return buildResponse({ ok:true, softDeleted:true }, 200);
  } else {
    sheet.deleteRow(idx);
    return buildResponse({ ok:true, deleted:true }, 200);
  }
}

function handleBatchUpsert(body, e){
  const auth = authorizeWrite(e, body);
  if (!auth.ok) return buildResponse(auth, 403);
  const table = body.table;
  const schema = SCHEMA[table];
  const records = Array.isArray(body.records) ? body.records : [];
  if (!records.length) return buildResponse({ ok:false, error:'empty_records' }, 400);

  const { sheet, headers } = getSheetAndHeaders(table);
  let created = 0, updated = 0;

  records.forEach(r => {
    const rec = validateRecord(table, r);
    const id = rec[schema.key];
    if (!id) return;

    if (table === 'users' && rec.password) {
      rec.passwordHash = encodeHash(String(rec.password));
      delete rec.password;
    }

    const idx = findRowByKey(sheet, headers, schema.key, id);
    if (idx > 0) {
      if (headers.includes('updatedAt')) rec.updatedAt = nowStr();
      const current = getRowObject(sheet, headers, idx);
      writeRow(sheet, headers, idx, { ...current, ...rec });
      updated++;
    } else {
      if (headers.includes('createdAt') && !rec.createdAt) rec.createdAt = nowStr();
      if (headers.includes('updatedAt')) rec.updatedAt = nowStr();
      appendRow(sheet, headers, rec);
      created++;
    }
  });

  return buildResponse({ ok:true, created, updated, total: created+updated }, 200);
}

/***** ================= SHEET HELPERS ================= *****/

function readAll(table){ return readTable(table).rows; }
function readTable(table){
  const { sheet, headers } = getSheetAndHeaders(table);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { headers, rows: [] };
  const range = sheet.getRange(2, 1, lastRow-1, headers.length);
  const values = range.getValues();
  const rows = values.map(row => rowToObj(headers, row)).filter(r => !isRowEmpty(r));
  return { headers, rows };
}
function getSheetAndHeaders(table){
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(table);
  if (!sheet) throw new Error('sheet_not_found:'+table);
  const headers = (sheet.getRange(1,1,1, sheet.getLastColumn()).getValues()[0] || []).map(String);
  return { sheet, headers };
}
function rowToObj(headers, row){
  const o = {};
  for (let i=0;i<headers.length;i++) o[headers[i]] = normalizeCell(row[i]);
  return o;
}
function getRowObject(sheet, headers, idx){
  const row = sheet.getRange(idx, 1, 1, headers.length).getValues()[0];
  return rowToObj(headers, row);
}
function writeRow(sheet, headers, rowIndex, obj){
  const row = headers.map(h => (h in obj ? toCell(obj[h]) : ''));
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
}
function appendRow(sheet, headers, obj){
  const row = headers.map(h => (h in obj ? toCell(obj[h]) : ''));
  sheet.appendRow(row);
}
function findRowByKey(sheet, headers, keyName, keyVal){
  const keyIdx = headers.indexOf(keyName);
  if (keyIdx < 0) throw new Error('key_not_in_headers:'+keyName);
  const last = sheet.getLastRow();
  if (last < 2) return -1;
  const col = keyIdx + 1;
  const rng = sheet.getRange(2, col, last-1);
  const vals = rng.getValues();
  for (let i=0;i<vals.length;i++){
    if (String(vals[i][0]) === String(keyVal)) return i + 2;
  }
  return -1;
}

/***** ================= VALIDATION/SERIALIZATION ================= *****/

function validateRecord(table, rec){
  const { headers, validators } = SCHEMA[table];
  const out = {};
  headers.forEach(h => {
    if (rec[h] === undefined) return;
    const vfn = validators?.[h];
    out[h] = vfn ? vfn(rec[h]) : rec[h];
  });
  return out;
}
function validatePatch(table, patch){
  const { headers, validators } = SCHEMA[table];
  const out = {};
  Object.keys(patch).forEach(h => {
    if (!headers.includes(h)) return;
    const vfn = validators?.[h];
    out[h] = vfn ? vfn(patch[h]) : patch[h];
  });
  return out;
}

function str(v, max){ v = (v==null?'':String(v)).trim(); return v.length>max ? v.slice(0,max) : v; }
function int(v){ v = parseInt(v,10); return isFinite(v)? v : 0; }
function bool(v){ return String(v)==='true' || v===true || v===1 || String(v)==='1'; }
function dateOrNow(v){ return (v ? toDateStr(v) : nowStr()); }
function jsonText(v, max){
  if (typeof v === 'string') {
    try { JSON.parse(v); } catch { v = JSON.stringify({ raw:v }); }
    return str(v, max);
  }
  try { return str(JSON.stringify(v), max); }
  catch { return 'null'; }
}
function toDateStr(d){
  if (d instanceof Date) return fmtDate(d);
  const t = (typeof d === 'number') ? new Date(d) : new Date(String(d));
  return isNaN(+t) ? nowStr() : fmtDate(t);
}
function nowStr(){ return fmtDate(new Date()); }
function fmtDate(d){
  const pad = (n)=> (n<10?'0':'')+n;
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
}
function normalizeCell(v){
  if (v instanceof Date) return fmtDate(v);
  if (typeof v === 'boolean') return v;
  if (v === '') return '';
  return v;
}
function toCell(v){ return (v instanceof Date) ? v : v; }
function isRowEmpty(o){ 
  return Object.values(o).every(v => {
    if (v == null || v === '') return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    if (typeof v === 'boolean') return false; // checkbox false é válido
    return false;
  });
}

/***** ================= SECURITY (CORS, SECRET, NONCE, CAPTCHA, RL) ================= *****/

function validateApiSecret(e){
  const secret = API_SECRET();
  if (!secret) return true;
  const p = e.parameter || {};
  const qOK = p.secret && String(p.secret) === secret;
  const hdr = e?.headers || {};
  const k = hdr['x-api-key'] || hdr['X-Api-Key'] || '';
  return qOK || String(k) === secret;
}

/**
 * Constrói a resposta HTTP com suporte adequado a CORS
 * IMPORTANTE: Google Apps Script não suporta .setHeader()
 * Use apenas .setMimeType() e retorne texto JSON
 */
function buildResponse(payload, status){
  payload = payload || {};
  payload.status = status;
  
  const output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  
  // NOTA: Não há como adicionar headers customizados em Google Apps Script
  // O CORS deve ser configurado no deployment como "Web app" com acesso "Anyone"
  // e o frontend deve fazer requisições adequadas
  
  return output;
}

function getClientIp(e){
  const h = e?.headers || {};
  return h['x-forwarded-for'] || h['X-Forwarded-For'] || h['x-real-ip'] || 'anon';
}
function hitLimit(key, maxPerMin){
  const c = CacheService.getScriptCache();
  const v = parseInt(c.get(key) || '0', 10) + 1;
  c.put(key, String(v), 60);
  return v > maxPerMin;
}
function newNonce(){
  const n = Utilities.getUuid();
  CacheService.getScriptCache().put('nonce:'+n, '1', 120);
  return n;
}
function consumeNonce(n){
  if (!n) return false;
  const c = CacheService.getScriptCache();
  const v = c.get('nonce:'+n);
  if (!v) return false;
  c.remove('nonce:'+n);
  return true;
}
function requiresNonce(action){
  return ['create','update','upsert','delete','batch_upsert','auth_change_password'].indexOf(action) >= 0;
}
function requiresCaptcha(action){
  return ['auth_login','create','update','upsert','delete','batch_upsert'].indexOf(action) >= 0;
}
function verifyRecaptcha(token){
  try{
    if (!token) return false;
    const secret = RECAPTCHA_SECRET();
    if (!secret) return true;
    const resp = UrlFetchApp.fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'post',
      payload: { secret: secret, response: token }
    });
    const data = JSON.parse(resp.getContentText());
    return !!(data.success && (data.score == null || data.score >= 0.7));
  }catch(err){ return false; }
}

/***** ================= SANITIZE USERS ================= *****/

function sanitizeUsers(rows){ return rows.map(sanitizeUser); }
function sanitizeUser(u){ const { passwordHash, ...safe } = u || {}; return safe; }

/***** ================= UTIL EXTRA: garantir cabeçalho/validações (opcional) ================= *****/
// Rode 1x para ajustar cabeçalho/validações sem apagar dados
function ensureSchemaNonDestructive(){
  const ss = SpreadsheetApp.getActive();
  Object.entries(SCHEMA).forEach(([name, meta]) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const headers = meta.headers;

    // coloca cabeçalho na linha 1 (sem limpar dados)
    sh.getRange(1,1,1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    sh.getRange('1:1').setFontWeight('bold').setBackground('#f1f3f4').setWrap(true);

    // datas
    const dateCols = headers
      .map((h,i)=> (/(createdAt|updatedAt|lastActiveAt)/.test(h) ? i+1 : null))
      .filter(Boolean);
    dateCols.forEach(col => sh.getRange(2, col, Math.max(1, sh.getMaxRows()-1), 1).setNumberFormat("yyyy-MM-dd HH:mm:ss"));

    // users: validação de role + checkbox isActive
    if (name === 'users') {
      const roleCol = headers.indexOf('role') + 1;
      if (roleCol > 0) {
        const rule = SpreadsheetApp.newDataValidation().requireValueInList(['admin','user'], true).build();
        sh.getRange(2, roleCol, Math.max(1, sh.getMaxRows()-1), 1).setDataValidation(rule);
      }
      const activeCol = headers.indexOf('isActive') + 1;
      if (activeCol > 0) {
        const rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
        sh.getRange(2, activeCol, Math.max(1, sh.getMaxRows()-1), 1).setDataValidation(rule);
      }
    }
  });
}

/***** ================= GET BY ID ================= *****/

function getById(table, id){
  const { sheet, headers } = getSheetAndHeaders(table);
  const idx = findRowByKey(sheet, headers, SCHEMA[table].key, id);
  if (idx <= 0) return null;
  return getRowObject(sheet, headers, idx);
}
