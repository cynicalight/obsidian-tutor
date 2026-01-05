import { readFileSync, writeFileSync } from "fs";

// Get version from npm env or package.json
let targetVersion = process.env.npm_package_version;
if (!targetVersion) {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  targetVersion = pkg.version;
}

// read minAppVersion from manifest.json and bump version to target version
let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// update versions.json with target version and minAppVersion from manifest.json
let versions = { [targetVersion]: minAppVersion };
try {
  versions = JSON.parse(readFileSync("versions.json", "utf8"));
  versions[targetVersion] = minAppVersion;
} catch {}
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
