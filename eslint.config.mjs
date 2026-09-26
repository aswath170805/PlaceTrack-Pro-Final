import nextConfig from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextConfig,
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts'],
  },
  {
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
];

export default config;