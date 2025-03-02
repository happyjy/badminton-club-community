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
          if (locator.setupRuntime) {
            locator.setupRuntime({
              hoveredElementBorderColor: 'rgba(75, 173, 239, 0.8)',
              disableKey: 'Alt',
              // locatorjs를 cursor IDE로 연결
              openFile: (path, line, column) => {
                const uri = `cursor://file/${encodeURIComponent(path)}:${line}:${column}`;
                window.open(uri, '_blank');
                return true;
              },
            });
          } else if (locator.default && locator.default.setupRuntime) {
            locator.default.setupRuntime({
              hoveredElementBorderColor: 'rgba(75, 173, 239, 0.8)',
              disableKey: 'Alt',
              // locatorjs를 cursor IDE로 연결
              openFile: (path, line, column) => {
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
