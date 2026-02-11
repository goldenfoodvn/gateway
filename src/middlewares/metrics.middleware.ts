/**
 * Metrics Middleware
 * Middleware để đo thời gian xử lý request và ghi nhận vào Prometheus metrics
 */

import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestsTotal } from '../utils/metrics.js';
import config from '../config/index.js';

/**
 * Middleware để ghi nhận metrics cho mỗi HTTP request
 * Đo thời gian xử lý và đếm số lượng request
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Skip nếu metrics bị tắt
  if (!config.metrics.enabled) {
    next();
    return;
  }

  // Bắt đầu đo thời gian
  const start = Date.now();

  // Lắng nghe sự kiện 'finish' khi response được gửi xong
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode.toString();

    // Ghi nhận thời gian xử lý request
    httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      duration
    );

    // Ghi nhận số lượng request
    httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode
    });
  });

  next();
};

export default metricsMiddleware;
