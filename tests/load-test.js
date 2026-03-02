import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const healthDuration = new Trend('health_duration');
const itemsDuration  = new Trend('items_duration');
const usersDuration  = new Trend('users_duration');
const errorRate      = new Rate('error_rate');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m',  target: 10 },
    { duration: '30s', target: 20 },
    { duration: '30s', target: 0  },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    error_rate:        ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

function testHealthEndpoint() {
  const res = http.get(`${BASE_URL}/health`, {
    tags: { endpoint: 'health' },
  });

  healthDuration.add(res.timings.duration);

  const success = check(res, {
    '[Health] Status 200':           (r) => r.status === 200,
    '[Health] Tiempo < 300ms':       (r) => r.timings.duration < 300,
    '[Health] Body tiene status OK': (r) => JSON.parse(r.body).status === 'OK',
    '[Health] Tiene campo uptime':   (r) => typeof JSON.parse(r.body).uptime === 'number',
  });

  errorRate.add(!success);
  sleep(1);
}

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
    '[Items] Item tiene campo name':  (r) => JSON.parse(r.body)[0].name !== undefined,
    '[Items] Item tiene campo stock': (r) => JSON.parse(r.body)[0].stock !== undefined,
  });

  errorRate.add(!success);
  sleep(1);
}

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

export default function () {
  const scenario = Math.random();

  if (scenario < 0.2) {
    testHealthEndpoint();
  } else if (scenario < 0.6) {
    testItemsEndpoint();
  } else {
    testUsersEndpoint();
  }
}
