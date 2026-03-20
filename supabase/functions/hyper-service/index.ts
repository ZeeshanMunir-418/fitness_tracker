import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const CONSUMER_KEY = Deno.env.get("FATSECRET_CONSUMER_KEY");
const CONSUMER_SECRET = Deno.env.get("FATSECRET_CONSUMER_SECRET");
const hmacSha1 = async (key, data) => {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    {
      name: "HMAC",
      hash: "SHA-1",
    },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(data),
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
};
const buildOAuthHeader = async (method, url, params) => {
  const oauthParams = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ""),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
  };
  // merge all params for signature
  const allParams = {
    ...params,
    ...oauthParams,
  };
  const sortedParams = Object.keys(allParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`)
    .join("&");
  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join("&");
  const signingKey = `${encodeURIComponent(CONSUMER_SECRET)}&`;
  const signature = await hmacSha1(signingKey, baseString);
  oauthParams["oauth_signature"] = signature;
  const headerValue =
    "OAuth " +
    Object.keys(oauthParams)
      .map(
        (k) =>
          `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`,
      )
      .join(", ");
  return headerValue;
};
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }
  const url = new URL(req.url);
  const query = (
    req.headers.get("x-query") ?? url.searchParams.get("q")
  )?.trim();
  if (!query) {
    return new Response(
      JSON.stringify({
        error: "query required",
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
  try {
    const apiUrl = "https://platform.fatsecret.com/rest/server.api";
    const params = {
      method: "foods.search",
      search_expression: query,
      max_results: "20",
      format: "json",
    };
    const authHeader = await buildOAuthHeader("GET", apiUrl, params);
    const queryString = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    const res = await fetch(`${apiUrl}?${queryString}`, {
      headers: {
        Authorization: authHeader,
      },
    });
    const data = await res.json();
    console.log("FatSecret response:", JSON.stringify(data));
    const foods = data.foods?.food;
    if (!foods)
      return new Response(
        JSON.stringify({
          results: [],
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    const results = (Array.isArray(foods) ? foods : [foods]).map((food) => {
      const desc = food.food_description ?? "";
      // FatSecret description format:
      // "Per 100g - Calories: 150kcal | Fat: 5g | Carbs: 10g | Protein: 8g"
      // or "Per 1 serving (250g) - Calories: 375kcal | ..."
      const servingMatch = desc.match(/^Per (.+?) -/);
      const servingSize = servingMatch?.[1] ?? "100g";
      const cal = desc.match(/Calories:\s*([\d.]+)/)?.[1] ?? "0";
      const fat = desc.match(/Fat:\s*([\d.]+)/)?.[1] ?? "0";
      const carbs = desc.match(/Carbs:\s*([\d.]+)/)?.[1] ?? "0";
      const protein = desc.match(/Protein:\s*([\d.]+)/)?.[1] ?? "0";
      return {
        foodId: food.food_id,
        foodName: food.food_name,
        servingSize,
        calories: parseFloat(cal),
        fatGrams: parseFloat(fat),
        carbsGrams: parseFloat(carbs),
        proteinGrams: parseFloat(protein),
      };
    });
    return new Response(
      JSON.stringify({
        results,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
});
