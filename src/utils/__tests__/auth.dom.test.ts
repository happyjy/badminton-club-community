import type { NextRouter } from 'next/router';

import { describe, expect, it, jest, beforeEach } from '@jest/globals';

import { KakaoAuth } from '@/utils/auth';

/** login()이 쓰는 부분만 채운 라우터. */
const router = { asPath: '/clubs/1' } as NextRouter;

/** window.Kakao를 지워 SDK가 아직 로드되지 않은 상태를 만든다. */
function clearKakao() {
  delete (window as { Kakao?: unknown }).Kakao;
}

function setKakao(authorize: () => void, isInitialized = true) {
  (window as unknown as { Kakao: unknown }).Kakao = {
    init: jest.fn(),
    isInitialized: () => isInitialized,
    Auth: { authorize },
  };
}

describe('KakaoAuth.login', () => {
  beforeEach(() => {
    clearKakao();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    process.env.NEXT_PUBLIC_KAKAO_JS_KEY = 'test-key';
  });

  it('SDK가 준비돼 있으면 바로 로그인을 시작한다', () => {
    const authorize = jest.fn();
    setKakao(authorize);

    KakaoAuth.login(router);

    expect(authorize).toHaveBeenCalledTimes(1);
  });

  it('SDK가 아직 로드되지 않아도 오류를 던지지 않는다', () => {
    // 이 경우 예전에는 undefined의 Auth를 읽다가 화면이 통째로 깨졌다.
    expect(() => KakaoAuth.login(router)).not.toThrow();
  });

  it('SDK가 늦게 도착하면 로드된 뒤에 로그인을 시작한다', () => {
    // async 스크립트가 아직 도착하지 않은 상태를 흉내낸다.
    const script = document.createElement('script');
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
    document.head.appendChild(script);

    KakaoAuth.login(router);

    const authorize = jest.fn();
    setKakao(authorize);
    script.dispatchEvent(new Event('load'));

    expect(authorize).toHaveBeenCalledTimes(1);
  });

  it('스크립트가 실패해 SDK가 없으면 조용히 멈춘다', () => {
    const script = document.createElement('script');
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
    document.head.appendChild(script);

    KakaoAuth.login(router);

    // window.Kakao가 없는 채로 load만 도착한 경우다.
    expect(() => script.dispatchEvent(new Event('load'))).not.toThrow();
  });

  it('로드를 기다리는 동안 여러 번 눌러도 한 번만 로그인한다', () => {
    const script = document.createElement('script');
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
    document.head.appendChild(script);

    KakaoAuth.login(router);
    KakaoAuth.login(router);
    KakaoAuth.login(router);

    const authorize = jest.fn();
    setKakao(authorize);
    script.dispatchEvent(new Event('load'));

    expect(authorize).toHaveBeenCalledTimes(1);
  });
});
