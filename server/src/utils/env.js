export const getEnv = (key, fallback) => {
  if (!process.env[key]) {
    console.warn(`⚠️ ENV missing: ${key}`);
  }
  return process.env[key] || fallback;
};
