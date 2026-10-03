import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/utils/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Pretendard Variable"',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Apple SD Gothic Neo"',
          '"Malgun Gothic"',
          'sans-serif',
        ],
      },
      // 값의 원본은 src/styles/globals.css의 :root다.
      colors: {
        bg: 'var(--color-bg)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          muted: 'var(--color-surface-muted)',
        },
        fill: 'var(--color-fill)',
        separator: 'var(--color-separator)',
        border: 'var(--color-border)',
        accent: 'var(--color-accent)',
        'on-accent': 'var(--color-on-accent)',
        scrim: 'var(--color-scrim)',
        kakao: 'var(--color-kakao)',
        tabbar: 'var(--color-tabbar)',
        positive: {
          DEFAULT: 'var(--color-positive)',
          soft: 'var(--color-positive-soft)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          soft: 'var(--color-warning-soft)',
        },
        negative: {
          DEFAULT: 'var(--color-negative)',
          soft: 'var(--color-negative-soft)',
        },
        neutral: {
          DEFAULT: 'var(--color-neutral)',
          soft: 'var(--color-neutral-soft)',
        },
        avatar: {
          1: 'var(--color-avatar-1)',
          2: 'var(--color-avatar-2)',
          3: 'var(--color-avatar-3)',
          4: 'var(--color-avatar-4)',
          5: 'var(--color-avatar-5)',
          6: 'var(--color-avatar-6)',
        },
      },
      textColor: {
        primary: 'var(--color-text)',
        secondary: 'var(--color-text-secondary)',
        tertiary: 'var(--color-text-tertiary)',
      },
      borderColor: {
        DEFAULT: 'var(--color-border)',
      },
      fontSize: {
        'large-title': [
          'var(--fs-large-title)',
          {
            lineHeight: 'var(--lh-large-title)',
            letterSpacing: '-0.02em',
            fontWeight: '700',
          },
        ],
        title: [
          'var(--fs-title)',
          {
            lineHeight: 'var(--lh-title)',
            letterSpacing: '-0.02em',
            fontWeight: '700',
          },
        ],
        headline: [
          'var(--fs-headline)',
          {
            lineHeight: 'var(--lh-headline)',
            letterSpacing: '-0.01em',
            fontWeight: '600',
          },
        ],
        body: [
          'var(--fs-body)',
          { lineHeight: 'var(--lh-body)', fontWeight: '400' },
        ],
        callout: [
          'var(--fs-callout)',
          { lineHeight: 'var(--lh-callout)', fontWeight: '400' },
        ],
        footnote: [
          'var(--fs-footnote)',
          { lineHeight: 'var(--lh-footnote)', fontWeight: '400' },
        ],
        caption: [
          'var(--fs-caption)',
          { lineHeight: 'var(--lh-caption)', fontWeight: '500' },
        ],
      },
      borderRadius: {
        sm: '8px',
        md: 'var(--radius-md)',
        lg: '16px',
      },
      boxShadow: {
        overlay: '0 8px 30px rgba(0, 0, 0, 0.12)',
      },
      zIndex: {
        tabbar: '30',
        dropdown: '40',
        sheet: '50',
        toast: '60',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
    },
  },
  plugins: [],
};

export default config;
