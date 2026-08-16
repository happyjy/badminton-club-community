// jsdom 환경 전용 설정.
// node 환경(jest.setup.js)과 달리 console을 모킹하지 않는다.
// React의 act() 경고나 key 경고를 삼키면 컴포넌트 테스트의 신호를 잃는다.
//
// @testing-library/jest-dom은 의도적으로 쓰지 않는다.
// 6.9.1의 매처 타입이 @jest/expect의 Matchers<R>(타입 인자 1개)를 확장하는데
// Jest 30의 Matchers는 <R, T> 2개라 선언 병합이 되지 않아 tsc가 실패한다.
// 표준 assertion(.value, .getAttribute(), toBeTruthy)으로 동일하게 검증한다.
