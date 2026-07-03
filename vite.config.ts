import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * wx-react-gantt@1.3.1 was built for React 18 and references
 * React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED which was
 * removed in React 19. This plugin patches the bundled CJS wrappers to
 * use a safe fallback object so the module can initialise without crashing.
 */
function ganttReact19Compat(): Plugin {
  return {
    name: 'gantt-react19-compat',
    transform(code, id) {
      if (!id.includes('wx-react-gantt')) return;

      // 1. React 19 removed __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
      //    replace all accesses with a safe fallback so the library initialises.
      let patched = code.replace(
        /([a-zA-Z$_][a-zA-Z$_0-9]*)(\.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED)/g,
        '($1$2||{ReactCurrentOwner:{current:null},ReactCurrentDispatcher:{current:null},ReactCurrentBatchConfig:{transition:null}})',
      );

      // 2. React 19 renamed the JSX element $$typeof symbol from
      //    "react.element" → "react.transitional.element".  The bundled
      //    React 18 jsx-runtime uses the old symbol, which React 19's
      //    reconciler rejects with error #525.  Upgrade every occurrence.
      patched = patched.replace(
        /Symbol\.for\("react\.element"\)/g,
        'Symbol.for("react.transitional.element")',
      );

      // 3. Svelte's init() has `root: e.target || r.$$.root` where r is the
      //    module-level current_component, which starts as undefined (not null).
      //    When a root component is created with no parent, r is undefined and
      //    r.$$.root throws.  Guard with optional chaining.
      patched = patched.replace(
        /root:e\.target\|\|r\.\$\$\.root/g,
        'root:e.target||(r&&r.$$&&r.$$.root)',
      );

      return { code: patched, map: null };
    },
  };
}

export default defineConfig({
  plugins: [ganttReact19Compat(), react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: { provider: 'v8' },
  },
});
