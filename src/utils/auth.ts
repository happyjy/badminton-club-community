import { NextRouter } from 'next/router';

export const redirectToLogin = (router: NextRouter) => {
  const currentPath = router.asPath;
  const encodedPath = encodeURIComponent(currentPath);
  router.push(`/auth/login?returnUrl=${encodedPath}`);
};
