import axios from "axios";

let accessToken: string | null = null;

const getAccessToken = async () => {
  if (accessToken) return accessToken;

  const res = await axios.post(
    "https://oauth.fatsecret.com/connect/token",
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.EXPO_PUBLIC_FATSECRET_CLIENT_ID!,
      client_secret: process.env.EXPO_PUBLIC_FATSECRET_CLIENT_SECRET!,
      scope: "basic",
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  accessToken = res.data.access_token;
  return accessToken;
};

export const fatSecretClient = axios.create({
  baseURL: "https://platform.fatsecret.com/rest/server.api",
});

fatSecretClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  config.headers.Authorization = `Bearer ${token}`;
  config.params = { ...config.params, format: "json" };
  return config;
});