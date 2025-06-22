import { useState, useEffect } from 'react';

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    const mobileCheck =
      /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      );
    setIsMobile(mobileCheck);
  }, []);

  return isMobile;
}

export default useIsMobile;
