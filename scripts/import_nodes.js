const { Client } = require("pg");

// 1) الاتصال (من env) + تعطيل التحقق من الشهادة حتى لا تظهر مشكلة self-signed
const CONN = process.env.RV_DB;
if (!CONN) { console.error("Missing RV_DB"); process.exit(1); }

const client = new Client({ connectionString: CONN, ssl: { rejectUnauthorized: false } });

// 2) بيانات الـ service_nodes كـ TSV (فواصل = \t). لا تعدلها.
const tsv = `
"id"\t"service_id"\t"kind"\t"name"\t"qr_code_id"\t"active"\t"geo_lat"\t"geo_lng"\t"geo"\t"geohash"\t"geo_source"\t"address"\t"city"\t"country"\t"meta_json"\t"created_at"\t"updated_at"\t"photo_url"\t"cover_url"\t"avatar_url"\t"website_url"\t"social_json"
"0785a7a0-fe21-4c03-bc48-80b0fe1449b6"\t"71f57943-46f9-4ac8-a6cc-733c93dd8a36"\t"location"\t"Cara Store - Main Branch"\t\ttrue\t24.426770231047232\t54.38424682826736\t"0101000020E6100000018004002F314B40154159D0406D3840"\t"thqdvwc2"\t"seed"\t"MBZ"\t"Abu Dhabi"\t"AE"\t"{""links"": {""maps"": ""https://www.google.com/maps?q=24.426770231047232,54.38424682826736""}, ""website"": ""https://www.carastore.example.com/cara-store-main-branch"", ""contacts"": {""phone"": ""+1555652254"", ""whatsapp"": ""+1555755270"", ""whatsapp_link"": ""https://wa.me/200211""}, ""cover_url"": ""/images/defaults/cover-r.jpg"", ""avatar_url"": ""/images/defaults/avatar-r.png"", ""description"": ""This branch is on Rateverse. Add details, hours and contact from your dashboard.""}"\t"2025-09-12 00:00:31.221233+03"\t"2025-09-25 05:45:05.624774+03"\t\t\t\t\t"{}"
"199f03a9-526b-4286-b483-4d6cf58a1d17"\t"4ee28579-0527-47d4-8e94-939edb7f93bc"\t"branch"\t"بنداء كافيي"\t\ttrue\t13.965071217037144\t44.165771644276724\t"0101000020E6100000E7625701381546408DF886D01DEE2B40"\t"sfrrmn28"\t"manual"\t"الشارع العام"\t"اب"\t\t"{}"\t"2025-09-27 01:55:34.112033+03"\t"2025-09-27 01:55:34.112033+03"\t\t\t\t\t"{}"
"3cab3d23-25b6-4150-aaf6-88827d70f283"\t"e1c86df0-1289-44ca-90c5-67904c05f580"\t"location"\t"الفرع الرئيسي"\t\ttrue\t15.3694\t44.191\t"0101000020E61000009CC420B072184640E9482EFF21BD2E40"\t"sfxrmtfv"\t"manual"\t\t"Sana'a"\t"YE"\t"{""links"": {""maps"": ""https://www.google.com/maps?q=15.3694,44.191""}, ""website"": ""https://www.kk.example.com/-"", ""contacts"": {""phone"": ""+1555324078"", ""whatsapp"": ""+1555989066"", ""whatsapp_link"": ""https://wa.me/207979""}, ""cover_url"": ""/images/defaults/cover-r.jpg"", ""avatar_url"": ""/images/defaults/avatar-r.png"", ""description"": ""This branch is on Rateverse. Add details, hours and contact from your dashboard.""}"\t"2025-08-17 22:46:00.491624+03"\t"2025-09-25 05:45:05.624774+03"\t\t\t\t\t"{}"
"5181e7ac-afbe-48b0-b7b5-ae88306a3955"\t"578019b7-4a6d-4b28-bcc1-7ef0e4c0e3ba"\t"location"\t"Cara Coffee - Main Branch"\t\ttrue\t25.2048\t55.2708\t"0101000020E6100000DFE00B93A9A24B408638D6C56D343940"\t"thrr3squ"\t"seed"\t"SZR"\t"Dubai"\t"AE"\t"{""links"": {""maps"": ""https://www.google.com/maps?q=25.2048,55.2708""}, ""website"": ""https://www.caracoffee.example.com/cara-coffee-main-branch"", ""contacts"": {""phone"": ""+1555273422"", ""whatsapp"": ""+1555649110"", ""whatsapp_link"": ""https://wa.me/822870""}, ""cover_url"": ""/images/defaults/cover-r.jpg"", ""avatar_url"": ""/images/defaults/avatar-r.png"", ""description"": ""This branch is on Rateverse. Add details, hours and contact from your dashboard.""}"\t"2025-09-12 00:00:31.202834+03"\t"2025-09-25 05:45:05.624774+03"\t\t\t\t\t"{}"
"7b4e1be9-4475-4b8b-8e9f-0de296ab807f"\t"c2c7151a-9b5c-464d-9a6f-5f86d1cf260e"\t"location"\t"????? ???????"\t\ttrue\t15.3694\t44.191\t"0101000020E61000009CC420B072184640E9482EFF21BD2E40"\t"sfxrmtfv"\t"manual"\t\t"Sana'a"\t"YE"\t"{""links"": {""maps"": ""https://www.google.com/maps?q=15.3694,44.191""}, ""website"": ""https://www.jj.example.com/-"", ""contacts"": {""phone"": ""+1555714768"", ""whatsapp"": ""+1555150216"", ""whatsapp_link"": ""https://wa.me/597838""}, ""cover_url"": ""/images/defaults/cover-r.jpg"", ""avatar_url"": ""/images/defaults/avatar-r.png"", ""description"": ""This branch is on Rateverse. Add details, hours and contact from your dashboard.""}"\t"2025-08-18 21:05:03.600798+03"\t"2025-09-25 05:45:05.624774+03"\t\t\t\t\t"{}"
"98dc122f-cd39-4f81-8cfd-40685ccc3721"\t"4ab5eabc-966d-4236-b2ee-6d15df2e825d"\t"location"\t"الانوار"\t\ttrue\t\t\t\t\t\t"Sana'a"\t"YE"\t"{""links"": {}, ""website"": ""https://www.jalal.example.com/-"", ""contacts"": {""phone"": ""+1555360898"", ""whatsapp"": ""+1555188804"", ""whatsapp_link"": ""https://wa.me/858661""}, ""cover_url"": ""/images/defaults/cover-r.jpg"", ""avatar_url"": ""/images/defaults/avatar-r.png"", ""description"": ""This branch is on Rateverse. Add details, hours and contact from your dashboard.""}"\t"2025-08-18 22:04:54.977512+03"\t"2025-09-25 05:45:05.624774+03"\t\t\t\t\t"{}"
"9ccbf3f1-f7c3-4f84-8cdd-9c72b5be0852"\t"100989a0-340a-4356-a04d-c22abd8bd933"\t"location"\t"????? ???????"\t\ttrue\t15.3694\t44.191\t"0101000020E61000009CC420B072184640E9482EFF21BD2E40"\t"sfxrmtfv"\t"manual"\t"???? ???"\t"Sana'a"\t"YE"\t"{""links"": {""maps"": ""https://www.google.com/maps?q=15.3694,44.191""}, ""website"": ""https://www.demorestaurant.example.com/-"", ""contacts"": {""phone"": ""+1555678229"", ""whatsapp"": ""+1555964572"", ""whatsapp_link"": ""https://wa.me/212312""}, ""cover_url"": ""/images/defaults/cover-r.jpg"", ""avatar_url"": ""/images/defaults/avatar-r.png"", ""description"": ""This branch is on Rateverse. Add details, hours and contact from your dashboard.""}"\t"2025-08-17 18:43:19.824507+03"\t"2025-09-25 05:45:05.624774+03"\t\t\t\t\t"{}"
"a2b42a88-5080-425a-99df-20cb105ea688"\t"564b6498-7030-4c1b-ae85-e79e5d141b93"\t"location"\t"Bob Coffee - Main Branch"\t\ttrue\t24.7136\t46.6753\t"0101000020E6100000917EFB3A70564740F46C567DAEB63840"\t"th3hw4gz"\t"seed"\t"Olaya"\t"Riyadh"\t"SA"\t"{""links"": {""maps"": ""https://www.google.com/maps?q=24.7136,46.6753""}, ""website"": ""https://www.bobcoffee.example.com/bob-coffee-main-branch"", ""contacts"": {""phone"": ""+1555408640"", ""whatsapp"": ""+1555653922"", ""whatsapp_link"": ""https://wa.me/334496""}, ""cover_url"": ""/images/defaults/cover-r.jpg"", ""avatar_url"": ""/images/defaults/avatar-r.png"", ""description"": ""This branch is on Rateverse. Add details, hours and contact from your dashboard.""}"\t"2025-09-12 00:00:31.166234+03"\t"2025-09-25 05:45:05.624774+03"\t\t\t\t\t"{}"
"a8ed2bd6-e15f-4cd3-9bbc-e0ad408828a0"\t"b4f8befd-596d-4dd7-a336-420a39b56a2f"\t"location"\t"Bob Store - Main Branch"\t\ttrue\t21.4858\t39.1925\t"0101000020E6100000713D0AD7A3984340956588635D7C3540"\t"sggf5z75"\t"seed"\t"Tahliya"\t"Jeddah"\t"SA"\t"{""links"": {""maps"": ""https://www.google.com/maps?q=21.4858,39.1925""}, ""website"": ""https://www.bobstore.example.com/bob-store-main-branch"", ""contacts"": {""phone"": ""+1555441256"", ""whatsapp"": ""+1555130219"", ""whatsapp_link"": ""https://wa.me/759229""}, ""cover_url"": ""/images/defaults/cover-r.jpg"", ""avatar_url"": ""/images/defaults/avatar-r.png"", ""description"": ""This branch is on Rateverse. Add details, hours and contact from your dashboard.""}"\t"2025-09-12 00:00:31.182208+03"\t"2025-09-25 05:45:05.624774+03"\t\t\t\t\t"{}"
"ceaba7db-19af-4edb-804b-0b4524e5e43a"\t"d5b383ab-969c-406b-8060-54a432945175"\t"location"\t"Alice Coffee - Main Branch"\t\ttrue\t15.3694\t44.191\t"0101000020E61000009CC420B072184640E9482EFF21BD2E40"\t"sfxrmtfv"\t"seed"\t"Main St"\t"Sanaa"\t"YE"\t"{""links"": {""maps"": ""https://www.google.com/maps?q=15.3694,44.191""}, ""website"": ""https://www.alicejjcoffee.example.com/alice-coffee-main-branch"", ""contacts"": {""phone"": ""+1555118977"", ""whatsapp"": ""+1555701667"", ""whatsapp_link"": ""https://wa.me/928088""}, ""cover_url"": ""/images/defaults/cover-r.jpg"", ""avatar_url"": ""/images/defaults/avatar-r.png"", ""description"": ""This branch is on Rateverse. Add details, hours and contact from your dashboard.""}"\t"2025-09-12 00:00:31.063063+03"\t"2025-09-25 05:45:05.624774+03"\t\t\t\t\t"{}"
"eccc3256-e078-4c2f-9afd-5dc6c033d720"\t"84e36f0f-6ba7-4c60-9432-9ea2f6ba5c01"\t"location"\t"Alice Store - Main Branch"\t\ttrue\t15.3704\t44.192\t"0101000020E61000007F6ABC749318464076E09C11A5BD2E40"\t"sfxrmw5e"\t"seed"\t"Main St"\t"Sanaa"\t"YE"\t"{""links"": {""maps"": ""https://www.google.com/maps?q=15.3704,44.192""}, ""website"": ""https://www.alicestore.example.com/alice-store-main-branch"", ""contacts"": {""phone"": ""+1555867928"", ""whatsapp"": ""+1555397387"", ""whatsapp_link"": ""https://wa.me/257693""}, ""cover_url"": ""/images/defaults/cover-r.jpg"", ""avatar_url"": ""/images/defaults/avatar-r.png"", ""description"": ""This branch is on Rateverse. Add details, hours and contact from your dashboard.""}"\t"2025-09-12 00:00:31.148233+03"\t"2025-09-25 05:45:05.624774+03"\t\t\t\t\t"{}"
`.trim();

// 3) Parser بسيط لـ TSV مع أعمدة مقتبسة
function parseTSV(txt) {
  const lines = txt.split(/\r?\n/);
  const header = lines.shift().split('\t').map(unq);
  const out = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = line.split('\t').map(unq);
    const obj = {};
    header.forEach((h, i) => obj[h] = (cells[i] ?? ""));
    out.push(obj);
  }
  return out;

  function unq(s) {
    if (s == null) return "";
    s = s.trim();
    if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1).replace(/""/g, '"');
    return s;
  }
}

function b(v){ if(!v) return null; const t=v.toLowerCase(); if(t==="true") return true; if(t==="false") return false; return null; }
function n(v){ if(v===""||v==null) return null; const x=Number(v); return Number.isFinite(x)?x:null; }
function d(v){ if(!v) return null; const t=new Date(v); return isNaN(t) ? null : t; }
function nn(v){ return (v===""||v==null) ? null : v; }

(async () => {
  try {
    await client.connect();
    await client.query("BEGIN");

    const rows = parseTSV(tsv);
    let done = 0;

    for (const r of rows) {
      const params = [
        nn(r.id),
        nn(r["service_id"]),
        nn(r.kind),
        nn(r.name),
        nn(r["qr_code_id"]),
        b(r.active),
        n(r["geo_lat"]),
        n(r["geo_lng"]),
        nn(r.geo),       // hex WKB for CASE
        nn(r.geohash),
        nn(r["geo_source"]),
        nn(r.address),
        nn(r.city),
        nn(r.country),
        nn(r["meta_json"]) || "{}",
        d(r["created_at"]),
        d(r["updated_at"]),
        nn(r["photo_url"]),
        nn(r["cover_url"]),
        nn(r["avatar_url"]),
        nn(r["website_url"]),
        nn(r["social_json"]) || "{}"
      ];

      const sql = `
        INSERT INTO public.service_nodes
          (id, service_id, kind, name, qr_code_id, active, geo_lat, geo_lng, geo, geohash, geo_source, address, city, country, meta_json, created_at, updated_at, photo_url, cover_url, avatar_url, website_url, social_json)
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,
          CASE WHEN $9 IS NULL OR $9 = '' THEN NULL ELSE ST_GeomFromWKB(decode($9,'hex'),4326) END,
          $10,$11,$12,$13,$14,
          $15::jsonb, $16, $17, $18, $19, $20, $21, $22::jsonb
        )
        ON CONFLICT (id) DO UPDATE SET
          service_id = excluded.service_id,
          kind       = excluded.kind,
          name       = excluded.name,
          qr_code_id = excluded.qr_code_id,
          active     = excluded.active,
          geo_lat    = excluded.geo_lat,
          geo_lng    = excluded.geo_lng,
          geo        = excluded.geo,
          geohash    = excluded.geohash,
          geo_source = excluded.geo_source,
          address    = excluded.address,
          city       = excluded.city,
          country    = excluded.country,
          meta_json  = excluded.meta_json,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          photo_url  = excluded.photo_url,
          cover_url  = excluded.cover_url,
          avatar_url = excluded.avatar_url,
          website_url= excluded.website_url,
          social_json= excluded.social_json;
      `;

      await client.query(sql, params);
      done++;
    }

    await client.query("COMMIT");
    const c = await client.query("SELECT COUNT(*)::int AS cnt FROM public.service_nodes");
    console.log(`✅ Imported ${done} rows. Total in public.service_nodes = ${c.rows[0].cnt}`);
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("❌ ERROR:", e.message || e);
    process.exit(1);
  } finally {
    await client.end().catch(()=>{});
  }
})();