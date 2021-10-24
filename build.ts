import * as esbuild from "esbuild";
import * as path from "path";
import { readdir } from "fs/promises";

const scriptsFolder = path.join(__dirname, "scripts");

readdir(scriptsFolder).then((scripts) => {
  const build = scripts.map((script) =>
    esbuild.build({
      entryPoints: [path.join(scriptsFolder, script, "index.ts")],
      bundle: true,
      platform: "node",
      outfile: path.join(__dirname, "build", script + ".js"),
    })
  );
  return Promise.all(build);
});
