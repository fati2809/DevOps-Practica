import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Métricas personalizadas
const itemsDuration = new Trend('items_duration');
const usersDuration = new Trend('users_duration');
const errorRate = new Rate('error_rate');

// Configuración de etapas de carga
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Rampa de subida
    { duration: '1m',  target: 10 },  // Carga sostenida
    { duration: '30s', target: 20 },  // Pico de carga
    { duration: '30s', target: 0  },  // Rampa de bajada
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% de peticiones < 500ms
    error_rate: ['rate<0.05'],         // Menos del 5% de errores
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// --- Escenario 1: Endpoint de Items ---
function testItemsEndpoint() {
  const res = http.get(`${BASE_URL}/items`, {
    tags: { endpoint: 'items' },
  });

  itemsDuration.add(res.timings.duration);

  const success = check(res, {
    '[Items] Status 200':      (r) => r.status === 200,
    '[Items] Tiempo < 500ms':  (r) => r.timings.duration < 500,
    '[Items] Body no vacío':   (r) => r.body.length > 0,
  });

  errorRate.add(!success);
  sleep(1);
}

// --- Escenario 2: Endpoint de Users ---
function testUsersEndpoint() {
  const res = http.get(`${BASE_URL}/users`, {
    tags: { endpoint: 'users' },
  });

  usersDuration.add(res.timings.duration);

  const success = check(res, {
    '[Users] Status 200':     (r) => r.status === 200,
    '[Users] Tiempo < 500ms': (r) => r.timings.duration < 500,
    '[Users] Body no vacío':  (r) => r.body.length > 0,
  });

  errorRate.add(!success);
  sleep(1);
}

// --- Escenario 3: Crear un item (POST) ---
function testCreateItem() {
  const payload = JSON.stringify({
    name: `Item-Test-${Date.now()}`,
    description: 'Creado por prueba de carga K6',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: 'items_post' },
  };

  const res = http.post(`${BASE_URL}/items`, payload, params);

  const success = check(res, {
    '[POST Items] Status 200 o 201': (r) => r.status === 200 || r.status === 201,
    '[POST Items] Tiempo < 800ms':   (r) => r.timings.duration < 800,
  });

  errorRate.add(!success);
  sleep(1);
}

// Función principal - se ejecuta por cada VU (usuario virtual)
export default function () {
  const scenario = Math.random();

  if (scenario < 0.4) {
    testItemsEndpoint();
  } else if (scenario < 0.8) {
    testUsersEndpoint();
  } else {
    testCreateItem();
  }
}
