process.env.NODE_ENV = "test";
process.env.PORT ||= "5001";
process.env.MONGO_URI ||= "mongodb://127.0.0.1:27017/linguae-test";
process.env.JWT_SECRET_KEY ||= "0123456789abcdef0123456789abcdef";
process.env.STREAM_API_KEY ||= "test-stream-key";
process.env.STREAM_API_SECRET ||= "test-stream-secret";
process.env.CSP_ENFORCE ||= "false";
