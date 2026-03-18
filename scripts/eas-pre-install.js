const fs = require("fs");
const path = require("path");

const projectRoot = process.cwd();
const outputPath = path.join(projectRoot, "google-services.json");

function decodeConfig(rawJson, rawBase64) {
  if (rawJson && rawJson.trim().length > 0) {
    return rawJson.trim();
  }

  if (rawBase64 && rawBase64.trim().length > 0) {
    return Buffer.from(rawBase64.trim(), "base64").toString("utf8").trim();
  }

  return "";
}

function validateJson(jsonText) {
  try {
    JSON.parse(jsonText);
    return true;
  } catch {
    return false;
  }
}

function isEasBuildContext() {
  return (
    process.env.EAS_BUILD === "true" ||
    Boolean(process.env.EAS_LOCAL_BUILD_WORKINGDIR) ||
    Boolean(process.env.EAS_BUILD_PLATFORM) ||
    Boolean(process.env.EAS_BUILD_RUNNER)
  );
}

function main() {
  const rawJson = process.env.GOOGLE_SERVICES_JSON;
  const rawBase64 = process.env.GOOGLE_SERVICES_JSON_BASE64;
  const config = decodeConfig(rawJson, rawBase64);

  if (config) {
    if (!validateJson(config)) {
      console.error(
        "[eas-pre-install] GOOGLE_SERVICES_JSON is not valid JSON. Check your secret value.",
      );
      process.exit(1);
    }

    fs.writeFileSync(outputPath, `${config}\n`, "utf8");
    console.log(`[eas-pre-install] Wrote ${outputPath} from env vars.`);
    return;
  }

  if (fs.existsSync(outputPath)) {
    console.log(
      `[eas-pre-install] Using existing ${outputPath}. No env var override provided.`,
    );
    return;
  }

  if (isEasBuildContext()) {
    console.error(
      "[eas-pre-install] Missing GOOGLE_SERVICES_JSON/GOOGLE_SERVICES_JSON_BASE64 and google-services.json file. Add google-services.json to the EAS upload (for example via .easignore) or provide one of the env vars.",
    );
    process.exit(1);
  }

  console.warn(
    "[eas-pre-install] No google-services config found locally. Skipping because this is not an EAS build.",
  );
}

main();
