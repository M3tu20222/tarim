/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppSidebar } from '@/components/app-sidebar';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/components/ui/sidebar';
import { useTheme } from 'next-themes';

// Mock the hooks
jest.mock('@/components/auth-provider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn().mockReturnValue('/dashboard'),
}));

jest.mock('@/components/ui/sidebar', () => ({
  useSidebar: jest.fn(),
}));

jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}));

describe('AppSidebar Navigation', () => {
  const mockRouter = {
    push: jest.fn(),
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    useRouter.mockReturnValue(mockRouter);
    useSidebar.mockReturnValue({ open: true, setOpen: jest.fn() });
    useTheme.mockReturnValue({ theme: 'dark', setTheme: jest.fn() });
  });
  
  test('Ana Sayfa button redirects to owner dashboard when user is OWNER', () => {
    // Mock user as OWNER
    useAuth.mockReturnValue({
      user: { id: '1', name: 'Test User', role: 'OWNER' },
      token: 'test-token',
    });
    
    render(<AppSidebar />);
    
    // Find and click the Ana Sayfa button
    const anaSayfaButton = screen.getByText('Ana Sayfa');
    fireEvent.click(anaSayfaButton);
    
    // Verify router.push was called with the correct path
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/owner');
  });
  
  test('Ana Sayfa button redirects to worker dashboard when user is WORKER', () => {
    // Mock user as WORKER
    useAuth.mockReturnValue({
      user: { id: '2', name: 'Test Worker', role: 'WORKER' },
      token: 'test-token',
    });
    
    render(<AppSidebar />);
    
    // Find and click the Ana Sayfa button
    const anaSayfaButton = screen.getByText('Ana Sayfa');
    fireEvent.click(anaSayfaButton);
    
    // Verify router.push was called with the correct path
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/worker');
  });
  
  test('Ana Sayfa button redirects to admin dashboard when user is ADMIN', () => {
    // Mock user as ADMIN
    useAuth.mockReturnValue({
      user: { id: '3', name: 'Test Admin', role: 'ADMIN' },
      token: 'test-token',
    });
    
    render(<AppSidebar />);
    
    // Find and click the Ana Sayfa button
    const anaSayfaButton = screen.getByText('Ana Sayfa');
    fireEvent.click(anaSayfaButton);
    
    // Verify router.push was called with the correct path
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/admin');
  });
  
  test('Ana Sayfa button redirects to generic dashboard when user role is not available', () => {
    // Mock user with no role
    useAuth.mockReturnValue({
      user: null,
      token: null,
    });
    
    render(<AppSidebar />);
    
    // Find and click the Ana Sayfa button
    const anaSayfaButton = screen.getByText('Ana Sayfa');
    fireEvent.click(anaSayfaButton);
    
    // Verify router.push was called with the generic dashboard path
    expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
  });
});
