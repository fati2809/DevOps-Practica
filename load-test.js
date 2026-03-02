import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Métricas personalizadas por endpoint
const healthDuration = new Trend('health_duration');
const itemsDuration  = new Trend('items_duration');
const usersDuration  = new Trend('users_duration');
const errorRate      = new Rate('error_rate');

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Rampa de subida
    { duration: '1m',  target: 10 }, // Carga sostenida
    { duration: '30s', target: 20 }, // Pico de carga
    { duration: '30s', target: 0  }, // Rampa de bajada
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% de peticiones bajo 500ms
    error_rate:        ['rate<0.05'], // Menos del 5% de errores
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// --- Escenario 1: Health check (GET /health) ---
function testHealthEndpoint() {
  const res = http.get(`${BASE_URL}/health`, {
    tags: { endpoint: 'health' },
  });

  healthDuration.add(res.timings.duration);

  const success = check(res, {
    '[Health] Status 200':           (r) => r.status === 200,
    '[Health] Tiempo < 300ms':       (r) => r.timings.duration < 300,
    '[Health] Body tiene status OK': (r) => {
      const body = JSON.parse(r.body);
      return body.status === 'OK';
    },
    '[Health] Tiene campo uptime':   (r) => {
      const body = JSON.parse(r.body);
      return typeof body.uptime === 'number';
    },
  });

  errorRate.add(!success);
  sleep(1);
}

// --- Escenario 2: Listado de items (GET /items) ---
function testItemsEndpoint() {
  const res = http.get(`${BASE_URL}/items`, {
    tags: { endpoint: 'items' },
  });

  itemsDuration.add(res.timings.duration);

  const success = check(res, {
    '[Items] Status 200':             (r) => r.status === 200,
    '[Items] Tiempo < 500ms':         (r) => r.timings.duration < 500,
    '[Items] Respuesta es un array':  (r) => Array.isArray(JSON.parse(r.body)),
    '[Items] Tiene al menos 1 item':  (r) => JSON.parse(r.body).length > 0,
    '[Items] Item tiene campo id':    (r) => JSON.parse(r.body)[0].id !== undefined,
    '[Items] Item tiene campo name':  (r) => JSON.parse(r.body)[0].name !== undefined,
    '[Items] Item tiene campo stock': (r) => JSON.parse(r.body)[0].stock !== undefined,
  });

  errorRate.add(!success);
  sleep(1);
}

// --- Escenario 3: Listado de usuarios (GET /users) ---
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

// Función principal — se ejecuta por cada usuario virtual
export default function () {
  const scenario = Math.random();

  if (scenario < 0.2) {
    testHealthEndpoint(); // 20% del tráfico al health check
  } else if (scenario < 0.6) {
    testItemsEndpoint();  // 40% del tráfico a items
  } else {
    testUsersEndpoint();  // 40% del tráfico a users
  }
}
