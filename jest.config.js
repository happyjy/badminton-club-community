// 공통 변환·모듈 설정. node/jsdom 두 프로젝트가 함께 쓴다.
const common = {
  transform: {
    // tsconfig는 Next.js가 자체 변환하도록 jsx: "preserve"로 두고 있다.
    // ts-jest는 변환기가 없으므로 테스트에서만 react-jsx로 올려 JSX를 컴파일한다.
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  moduleNameMapper: {
    // 정적 자산은 ts-jest가 변환하지 못하므로 스텁으로 바꿔치기한다.
    // '@/' 별칭보다 먼저 와야 '@/icon/spinner.svg'가 여기서 걸린다.
    '\\.(svg|png|jpg|jpeg|gif|webp|avif|ico|bmp)$':
      '<rootDir>/__mocks__/fileMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: ['node_modules/(?!(@prisma/client)/)'],
};

module.exports = {
  // 대부분의 테스트는 순수 로직이라 node 환경이 빠르다.
  // 컴포넌트 렌더링이 필요한 '*.dom.test.tsx'만 jsdom으로 분리한다.
  projects: [
    {
      ...common,
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['**/*.test.ts', '**/*.test.tsx'],
      testPathIgnorePatterns: ['/node_modules/', '\\.dom\\.test\\.tsx?$'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    },
    {
      ...common,
      displayName: 'dom',
      testEnvironment: 'jsdom',
      testMatch: ['**/*.dom.test.ts', '**/*.dom.test.tsx'],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.dom.js'],
    },
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
