const path = require("path");
const { defineConfig } = require("@meteorjs/rspack");

/**
 * Rspack configuration for Meteor projects.
 *
 * Provides typed flags on the `Meteor` object, such as:
 * - `Meteor.isClient` / `Meteor.isServer`
 * - `Meteor.isDevelopment` / `Meteor.isProduction`
 * - …and other flags available
 *
 * Use these flags to adjust your build settings based on environment.
 */
module.exports = defineConfig((Meteor) => {
  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "imports"),
      },
    },
    module: {
      rules: [
        // Tailwind + PostCSS: Rspack experiments.css does not read postcss.config.js by itself.
        {
          test: /\.css$/i,
          enforce: "pre",
          use: [
            {
              loader: "postcss-loader",
              options: {
                postcssOptions: {
                  config: path.join(__dirname, "postcss.config.js"),
                },
              },
            },
          ],
          type: "css",
        },
        // Add support for importing SVGs as React components
        {
          test: /\.svg$/i,
          issuer: /\.[jt]sx?$/,
          use: ["@svgr/webpack"],
        },
      ],
    },
  };
});
