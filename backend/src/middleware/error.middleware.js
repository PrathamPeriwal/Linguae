import mongoose from "mongoose";
import { env } from "../config/env.js";

function statusOf(error) {
  const status = Number(error?.status ?? error?.statusCode);
  return Number.isInteger(status) ? status : 0;
}

function isJsonSyntax(error) {
  return (
    error?.type === "entity.parse.failed" ||
    (error instanceof SyntaxError && statusOf(error) === 400)
  );
}

function isTooLarge(error) {
  return error?.type === "entity.too.large" || statusOf(error) === 413;
}

function isDuplicateKey(error) {
  return error?.code === 11000 || error?.cause?.code === 11000;
}

function isCastError(error) {
  return error instanceof mongoose.Error.CastError || error?.name === "CastError";
}

function isValidationError(error) {
  return (
    error instanceof mongoose.Error.ValidationError || error?.name === "ValidationError"
  );
}

function logUnexpected(error) {
  const name = error?.name || "Error";
  const message = error?.message || "";
  if (env.NODE_ENV === "development") {
    console.error(name, message, error?.stack);
  } else {
    console.error(name, message);
  }
}

export function notFound(_req, res) {
  res.status(404).json({ message: "Not found" });
}

export function errorHandler(error, _req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error?.type === "cors") {
    res.status(403).json({ message: "Origin not allowed" });
    return;
  }

  if (isJsonSyntax(error)) {
    res.status(400).json({ message: "Invalid JSON" });
    return;
  }

  if (isTooLarge(error)) {
    res.status(413).json({ message: "Payload too large" });
    return;
  }

  if (isCastError(error) || isValidationError(error)) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }

  if (isDuplicateKey(error)) {
    res.status(400).json({ message: "Duplicate value" });
    return;
  }

  if (statusOf(error) === 404) {
    res.status(404).json({ message: "Not found" });
    return;
  }

  logUnexpected(error);
  res.status(500).json({ message: "Internal Server Error" });
}
