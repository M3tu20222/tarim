import React from 'react';

export const TemperatureIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V4a1 1 0 00-1-1h-2a1 1 0 00-1 1v12a5 5 0 005 5h1a1 1 0 001-1v-2a1 1 0 00-1-1h-1z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h.01M15 12h.01M12 9h.01M12 15h.01" />
  </svg>
);

export const RainIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-1.414V17m0-10v.01" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v.01M12 21v.01M3 12h.01M21 12h.01" />
  </svg>
);

export const WindIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l-4-4m0 0l4-4m-4 4h14" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12l4 4m0 0l4-4m-4 4V5" />
  </svg>
);

export const SoilIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v2H4z" />
  </svg>
);

export const CloudIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.09A4.001 4.001 0 003 15z" />
  </svg>
);

export const GeminiIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M7 24C7 33.3888 14.6112 41 24 41C33.3888 41 41 33.3888 41 24C41 14.6112 33.3888 7 24 7" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M24 7C14.6112 7 7 14.6112 7 24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M41 24C41 33.3888 33.3888 41 24 41" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17.0405 23.5C18.4262 20.3333 21.5 18 24 18C26.5 18 29.5738 20.3333 30.9595 23.5C32.3452 26.6667 30.0119 31 24 31C17.9881 31 15.6548 26.6667 17.0405 23.5Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const HumidityIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3.5C12 3.5 7 8.036 7 11.5A5 5 0 1017 11.5C17 8.036 12 3.5 12 3.5z" />
  </svg>
);

export const ProbabilityIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    <circle cx="9" cy="6" r="2" fill="currentColor" />
    <circle cx="15" cy="12" r="2" fill="currentColor" />
    <circle cx="9" cy="18" r="2" fill="currentColor" />
  </svg>
);

export const SunIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <circle cx="12" cy="12" r="4" strokeWidth={2} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);
