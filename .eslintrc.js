module.exports = {
  rules: {
    '@typescript-eslint/no-explicit-any': 'off', // 전체 프로젝트에서 규칙 비활성화
    // 또는
    '@typescript-eslint/no-explicit-any': [
      'error',
      {
        ignoreRestArgs: true,
        fixToUnknown: false,
      },
    ], // 규칙 옵션 조정
  },
  overrides: [
    {
      // 특정 파일에만 규칙 적용
      files: ['src/components/LocatorProvider.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
