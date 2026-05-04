// jest projects 분리
// - node: 순수 lib/유틸 단위 테스트 (기본)
// - jsdom: 훅·컴포넌트 테스트 (*.dom.test.ts(x))
// ts-jest는 tsconfig의 jsx: 'preserve'를 그대로 따라가서 .tsx의 JSX를 변환하지 못한다.
// 테스트 환경에서만 'react-jsx'로 오버라이드해 jest가 파싱 가능하게 한다.
const baseTransform = {
  '^.+\\.(ts|tsx)$': [
    'ts-jest',
    {
      tsconfig: {
        jsx: 'react-jsx',
      },
    },
  ],
};

const baseModuleNameMapper = {
  '^@/(.*)$': '<rootDir>/src/$1',
};

const baseTransformIgnorePatterns = ['node_modules/(?!(@prisma/client)/)'];

const baseSetupFilesAfterEnv = ['<rootDir>/jest.setup.js'];

module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['**/*.test.ts', '**/*.test.tsx'],
      testPathIgnorePatterns: ['/node_modules/', '\\.dom\\.test\\.tsx?$'],
      transform: baseTransform,
      moduleNameMapper: baseModuleNameMapper,
      transformIgnorePatterns: baseTransformIgnorePatterns,
      setupFilesAfterEnv: baseSetupFilesAfterEnv,
    },
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: ['**/*.dom.test.ts', '**/*.dom.test.tsx'],
      transform: baseTransform,
      moduleNameMapper: baseModuleNameMapper,
      transformIgnorePatterns: baseTransformIgnorePatterns,
      setupFilesAfterEnv: baseSetupFilesAfterEnv,
    },
  ],
};
