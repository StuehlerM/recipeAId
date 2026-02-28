module.exports = {
  default: {
    paths: ["features/**/*.feature"],
    requireModule: ["tsx/cjs"],
    require: [
      "src/support/world.ts",
      "src/support/hooks.ts",
      "src/steps/**/*.steps.ts",
    ],
    format: ["progress-bar", "html:reports/report.html"],
    formatOptions: { snippetInterface: "async-await" },
    publishQuiet: true,
    parallel: 1,
    worldParameters: {
      frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
      backendUrl: process.env.BACKEND_URL ?? "http://localhost:5228",
    },
  },
};
