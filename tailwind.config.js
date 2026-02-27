/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Background system
        background: '#F6F8FB',
        surface: '#FFFFFF',
        'surface-alt': '#F2F6FF',

        // Text hierarchy
        'text-primary': '#0F172A',
        'text-secondary': '#475569',
        'text-muted': '#94A3B8',

        // Borders & dividers
        border: '#E2E8F0',
        divider: '#EDF2F7',

        // Primary brand — dark navy (buttons, links, focus)
        primary: {
          DEFAULT: '#034891',
          hover: '#023670',
          light: '#E6F0FA',
          50: '#F0F5FA',
        },

        // Secondary (teal accent for chips/toggles)
        secondary: {
          DEFAULT: '#00A99D',
          light: '#E6F7F6',
        },

        // Accent (price highlight)
        accent: {
          DEFAULT: '#FF7A00',
          light: '#FFF4E6',
        },

        // Semantic colors
        success: {
          DEFAULT: '#16A34A',
          light: '#DCFCE7',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
        },
        danger: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
        },

        // Score badge (GREEN - from iOS design)
        score: {
          DEFAULT: '#22C55E',
          excellent: '#22C55E',  // 85+
          good: '#034891',       // 70-85
          fair: '#F59E0B',       // 50-70
          poor: '#6B7280',       // <50
        },

        // Legacy AirEase brand colors — dark navy
        airease: {
          blue: '#034891',
          'blue-dark': '#023670',
          'blue-light': '#0560B8',
          'blue-50': '#E6F0FA',
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        causten: ['"Causten Round"', 'Nunito', 'Quicksand', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'heading-1': ['28px', { lineHeight: '1.2', fontWeight: '700' }],
        'heading-2': ['24px', { lineHeight: '1.25', fontWeight: '700' }],
        'heading-3': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '1.45', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.45', fontWeight: '400' }],
        'label': ['13px', { lineHeight: '1.4', fontWeight: '600' }],
        'small': ['12px', { lineHeight: '1.4', fontWeight: '500' }],
      },

      borderRadius: {
        'card': '14px',
        'input': '12px',
        'chip': '999px',
        'button': '12px',
      },

      boxShadow: {
        'card': '0 6px 20px rgba(15, 23, 42, 0.06)',
        'card-hover': '0 8px 30px rgba(15, 23, 42, 0.10)',
        'sticky': '0 4px 16px rgba(15, 23, 42, 0.08)',
        'dropdown': '0 10px 40px rgba(15, 23, 42, 0.12)',
        'button': '0 2px 8px rgba(27, 43, 90, 0.25)',
      },

      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '120': '30rem',
      },

      maxWidth: {
        'content': '1200px',
        'narrow': '800px',
      },

      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },

      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },

      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },

      transitionDuration: {
        '250': '250ms',
      },
    },
  },
  plugins: [],
}
