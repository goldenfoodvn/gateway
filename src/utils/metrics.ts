/**
 * Prometheus Metrics Configuration
 * Khởi tạo Registry và các metrics cơ bản để giám sát hiệu năng hệ thống
 */

import { Registry, Histogram, Counter } from 'prom-client';

// Tạo registry để quản lý tất cả metrics
export const register = new Registry();

// Metric: Thời gian xử lý HTTP request (histogram)
// Đo thời gian từ khi request đến cho đến khi response được gửi
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10] // Buckets in seconds
});

// Metric: Tổng số HTTP request (counter)
// Đếm tổng số request theo method, route và status code
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Đăng ký các metrics vào registry
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);

// Export registry để sử dụng cho endpoint /metrics
export default register;
