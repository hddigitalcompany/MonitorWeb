import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../src/lib/locaisSeguros.js', import.meta.url));
const { consultaMunicipio, interpretarLocais, buscarLocaisSegurosCidade, resolverCoordenadas } = await import(`data:text/javascript;base64,${source.toString('base64')}`);
const municipio = { type: 'relation', id: 1, center: { lat: -23.5, lon: -46.6 }, tags: { boundary: 'administrative', admin_level: '8', name: 'São Paulo' } };

test('busca limites do município e inclui pontos, prédios e relações', () => {
  const q = consultaMunicipio({ texto: 'São Paulo, São Paulo, Brazil', lat: -23.55, lon: -46.63 });
  assert.match(q, /is_in\(-23.55,-46.63\)/);
  assert.match(q, /nwr\(area.cidade\)/);
  assert.doesNotMatch(q, /around:/);
});

test('cidade sem coordenadas é geocodificada pelo nome e estado', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(new URL(url).searchParams.get('city'), 'Sao Paulo');
    assert.equal(new URL(url).searchParams.get('state'), 'Sao Paulo');
    return { ok: true, json: async () => [{ lat: '-23.55', lon: '-46.63' }] };
  };
  try {
    const r = await resolverCoordenadas({ texto: 'Sao Paulo, Sao Paulo, Brazil' });
    assert.equal(r.lat, -23.55);
    assert.equal(r.lon, -46.63);
    assert.throws(() => consultaMunicipio({ lat: null, lon: null }));
    assert.throws(() => consultaMunicipio({ lat: 91, lon: 0 }));
    await assert.rejects(() => resolverCoordenadas({}));
  } finally { globalThis.fetch = original; }
});

test('normaliza pontos, polígonos e relações sem colisão de IDs', () => {
  const elements = [municipio,
    { type: 'node', id: 5, lat: 0, lon: 0, tags: { amenity: 'restaurant', name: 'Restaurante' } },
    { type: 'way', id: 5, center: { lat: -23.6, lon: -46.7 }, tags: { shop: 'supermarket', name: 'Mercado', 'addr:street': 'Rua A' } },
    { type: 'relation', id: 5, center: { lat: -23.7, lon: -46.8 }, tags: { amenity: 'fuel' } },
    { type: 'node', id: 6, tags: { amenity: 'hospital' } },
    { type: 'node', id: 7, lat: -23, lon: -46, tags: { amenity: 'police' } },
  ];
  const resultado = interpretarLocais({ elements }, {});
  assert.equal(resultado.cidade, 'São Paulo');
  assert.equal(resultado.locais.length, 3);
  assert.equal(new Set(resultado.locais.map(l => l.id)).size, 3);
  assert.equal(resultado.locais.find(l => l.id === 'way/5').endereco, 'Rua A');
});

test('distingue cidade sem locais de falha ou resposta parcial', () => {
  assert.deepEqual(interpretarLocais({ elements: [municipio] }, {}).locais, []);
  assert.throws(() => interpretarLocais({ elements: [] }, {}));
  assert.throws(() => interpretarLocais({ elements: [municipio], remark: 'timeout' }, {}));
});

test('usa o servidor alternativo quando o primeiro falha', async () => {
  const original = globalThis.fetch;
  let tentativas = 0;
  globalThis.fetch = async () => {
    tentativas++;
    return tentativas === 1 ? { ok: false, status: 503 } : { ok: true, json: async () => ({ elements: [municipio] }) };
  };
  try {
    assert.equal((await buscarLocaisSegurosCidade({ lat: -23.5, lon: -46.6 })).cidade, 'São Paulo');
    assert.equal(tentativas, 2);
  } finally { globalThis.fetch = original; }
});

test('mantém o mapa disponível quando os dois provedores falham', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  try {
    const r = await buscarLocaisSegurosCidade({ lat: -23.5, lon: -46.6 });
    assert.equal(r.lat, -23.5);
    assert.deepEqual(r.locais, []);
    assert.ok(r.aviso);
  } finally { globalThis.fetch = original; }
});

test('consulta área municipal já resolvida diretamente', () => {
  const q = consultaMunicipio({ lat: -23.5, lon: -46.6, areaId: 3600298285 });
  assert.match(q, /area\(3600298285\)/);
  assert.doesNotMatch(q, /is_in/);
});

test('inclui categorias do cotidiano em amenity e shop e exclui polícia', () => {
  const tipos = [
    ['amenity', 'restaurant', 'Restaurante'], ['amenity', 'fast_food', 'Lanchonete'],
    ['amenity', 'cafe', 'Cafeteria'], ['amenity', 'fuel', 'Posto de combustível'],
    ['amenity', 'pharmacy', 'Farmácia'], ['amenity', 'marketplace', 'Mercado / feira'],
    ['shop', 'supermarket', 'Supermercado'], ['shop', 'convenience', 'Conveniência / minimercado'],
    ['shop', 'bakery', 'Padaria'], ['shop', 'greengrocer', 'Hortifrúti'],
    ['shop', 'butcher', 'Açougue'], ['shop', 'mall', 'Shopping'],
  ];
  const q = consultaMunicipio({ lat: -23.5, lon: -46.6 });
  const elements = [municipio, ...tipos.map(([chave, valor], i) => ({ type: 'node', id: i + 10, lat: -23.5, lon: -46.6, tags: { [chave]: valor } }))];
  const resultado = interpretarLocais({ elements }, {});
  assert.equal(resultado.locais.length, tipos.length);
  for (const [, tag, tipo] of tipos) {
    assert.ok(q.includes(tag));
    assert.ok(resultado.locais.some(l => l.tipo === tipo && l.categoria));
  }
  assert.ok(q.includes('["shop"'));
  assert.doesNotMatch(q, /police|fire_station|hospital/);
});
