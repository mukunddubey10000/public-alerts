// Patch graceful-fs before Metro uses it (fixes "cannot find module tools/gracefulifyFs")
const { gracefulify } = require('graceful-fs');
gracefulify(require('fs'));

module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};
