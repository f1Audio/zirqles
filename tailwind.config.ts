import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		animation: {
  			'spin-reverse': 'spin-reverse 4s linear infinite',
  			'glow': 'glow 3s ease-in-out infinite',
  			'pulse': 'pulse 4s ease-in-out infinite',
  			'scan': 'scan 2s ease-in-out infinite',
  			'blink': 'blink 4s ease-in-out infinite',
  			'lightning': 'lightning 2s ease-in-out infinite',
  		},
  		keyframes: {
  			'spin-reverse': {
  				from: {
  					transform: 'rotate(360deg)',
  				},
  				to: {
  					transform: 'rotate(0deg)',
  				},
  			},
  			'glow': {
  				'0%, 100%': {
  					opacity: '0.95',
  					transform: 'scale(0.9)',
  					filter: 'brightness(1.2)',
  				},
  				'50%': {
  					opacity: '1',
  					transform: 'scale(1)',
  					filter: 'brightness(1.4)',
  				},
  			},
  			'scan': {
  				'0%': {
  					transform: 'translateY(0%) scaleX(1.5)',
  					opacity: '0',
  				},
  				'50%': {
  					transform: 'translateY(50%) scaleX(1.5)',
  					opacity: '1',
  				},
  				'100%': {
  					transform: 'translateY(100%) scaleX(1.5)',
  					opacity: '0',
  				},
  			},
  			'blink': {
  				'0%, 100%': {
  					transform: 'translateY(-100%)',
  				},
  				'95%': {
  					transform: 'translateY(-100%)',
  				},
  				'97.5%': {
  					transform: 'translateY(0%)',
  				},
  			},
  			'lightning': {
  				'0%, 100%': {
  					opacity: '0',
  					transform: 'scaleY(0.5)',
  				},
  				'5%, 95%': {
  					opacity: '0',
  				},
  				'50%': {
  					opacity: '1',
  					transform: 'scaleY(1)',
  				},
  			},
  		},
  		fontFamily: {
  			sans: [
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'Helvetica',
  				'Arial',
  				'sans-serif'
  			],
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;

