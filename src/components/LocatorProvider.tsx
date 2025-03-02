import { useEffect } from 'react';

export default function LocatorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('@locator/runtime')
        .then((locator) => {
          // 모듈 구조를 올바르게 처리하기 위해 any 타입으로 변환
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const locatorModule = locator as any;

          // const locatorModule = locator as any;
          // interface LocatorModule {
          //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
          //   setupRuntime?: (config: any) => void;
          //   default?: {
          //     // eslint-disable-next-line @typescript-eslint/no-explicit-any
          //     setupRuntime?: (config: any) => void;
          //   };
          // }
          // const locatorModule = locator as LocatorModule;

          // setupRuntime 함수에 접근하는 다양한 방법 시도
          const setup =
            locatorModule.setupRuntime || locatorModule.default?.setupRuntime;

          if (setup) {
            setup({
              hoveredElementBorderColor: 'rgba(75, 173, 239, 0.8)',
              disableKey: 'Alt',
              // locatorjs를 cursor IDE로 연결
              openFile: (path: string, line: number, column: number) => {
                const uri = `cursor://file/${encodeURIComponent(path)}:${line}:${column}`;
                window.open(uri, '_blank');
                return true;
              },
            });
          } else {
            console.error('LocatorJS: setupRuntime 함수를 찾을 수 없습니다.');
          }
        })
        .catch((err) => {
          console.error('LocatorJS 모듈을 로드할 수 없습니다:', err);
        });
    }
  }, []);

  return <>{children}</>;
}
