require("dotenv").config();

const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const winston = require("winston");
require("winston-daily-rotate-file");

const app = express();

/* =========================================================
   CONFIGURATION
========================================================= */

const PORT = process.env.PORT || 7812;
const MODE = process.env.PROXY_MODE || "reverse"; // reverse | forward
const SERVER_URL = process.env.SERVER_URL;
const API_KEY = process.env.API_KEY || null;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const REQUEST_LIMIT = process.env.REQUEST_LIMIT || "10mb";
const TRUST_PROXY = process.env.TRUST_PROXY === "true";
const IP_WHITELIST = process.env.IP_WHITELIST
  ? process.env.IP_WHITELIST.split(",")
  : null;

if (MODE === "reverse" && !SERVER_URL) {
  console.error("SERVER_URL is required in reverse mode");
  process.exit(1);
}

if (TRUST_PROXY) {
  app.set("trust proxy", 1);
}

/* =========================================================
   LOGGER (Winston + Daily Rotation)
========================================================= */

const transport = new winston.transports.DailyRotateFile({
  filename: "logs/proxy-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    transport,
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

/* =========================================================
   SECURITY MIDDLEWARE
========================================================= */

app.use(helmet());
app.use(compression());

app.use(express.json({ limit: REQUEST_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: REQUEST_LIMIT }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
});
app.use(limiter);

app.use(cors({ origin: ALLOWED_ORIGIN }));

/* =========================================================
   ACCESS CONTROL
========================================================= */

// Optional API key protection
if (API_KEY) {
  app.use((req, res, next) => {
    if (req.headers["x-api-key"] !== API_KEY) {
      logger.warn("Unauthorized access attempt", { ip: req.ip });
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  });
}

// Optional IP whitelist
if (IP_WHITELIST) {
  app.use((req, res, next) => {
    if (!IP_WHITELIST.includes(req.ip)) {
      logger.warn("Blocked IP", { ip: req.ip });
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  });
}

/* =========================================================
   REQUEST LOGGING
========================================================= */

app.use((req, res, next) => {
  logger.info("Incoming request", {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });
  next();
});

/* =========================================================
   HEALTH + READINESS
========================================================= */

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    mode: MODE,
    uptime: process.uptime(),
  });
});

app.get("/ready", (req, res) => {
  res.status(200).json({ ready: true });
});

/* =========================================================
   REVERSE PROXY (DEFAULT)
========================================================= */

if (MODE === "reverse") {
  app.use(
    "/",
    createProxyMiddleware({
      target: SERVER_URL,
      changeOrigin: true,
      ws: true,
      proxyTimeout: 20000,
      timeout: 20000,
      secure: true,
      onError(err, req, res) {
        logger.error("Proxy error", { message: err.message });
        res.status(502).json({ error: "Bad Gateway" });
      },
      onProxyReq(proxyReq, req) {
        proxyReq.setHeader("X-Forwarded-For", req.ip);
      },
    })
  );
}

/* =========================================================
   FORWARD PROXY (LOCKED DOWN)
========================================================= */

if (MODE === "forward") {
  app.use(
    "/",
    createProxyMiddleware({
      router: (req) => {
        if (!req.query.url) {
          throw new Error("Missing ?url parameter");
        }
        return req.query.url;
      },
      changeOrigin: true,
      secure: true,
      onError(err, req, res) {
        logger.error("Forward proxy error", { message: err.message });
        res.status(400).json({ error: "Invalid target URL" });
      },
    })
  );
}

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use((err, req, res, next) => {
  logger.error("Unhandled error", { message: err.message });
  res.status(500).json({ error: "Internal Server Error" });
});

/* =========================================================
   START SERVER
========================================================= */

const server = app.listen(PORT, () => {
  logger.info("Proxy server started", {
    port: PORT,
    mode: MODE,
    target: SERVER_URL || "dynamic",
  });
});

/* =========================================================
   GRACEFUL SHUTDOWN
========================================================= */

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

function shutdown() {
  logger.info("Shutting down gracefully...");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
}
