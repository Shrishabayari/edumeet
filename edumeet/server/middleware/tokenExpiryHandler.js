import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { tokenManager } from '../services/api';

/**
 * Component to handle expired tokens and auto-redirect to appropriate login pages
 * Place this component in your main App.js or at the root of your admin routes
 */
const TokenExpiryHandler = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkTokenExpiry = () => {
      const currentPath = location.pathname;
      const currentRole = tokenManager.getCurrentRole();

      // Skip check for public routes
      const publicRoutes = ['/login', '/register', '/admin/login', '/teacher/login', '/'];
      const isPublicRoute = publicRoutes.some(route => currentPath.startsWith(route));
      
      if (isPublicRoute) {
        return;
      }

      // Check admin routes
      if (currentPath.startsWith('/admin')) {
        const adminToken = tokenManager.getAdminToken();
        const isAdminTokenExpired = tokenManager.isTokenExpired('admin');
        
        if (adminToken && isAdminTokenExpired) {
          console.warn('🔒 Admin token expired, redirecting to login...');
          tokenManager.removeAdminToken();
          
          // Show alert to user (optional)
          if (window.confirm('Your session has expired. Please login again.')) {
            navigate('/admin/login', { 
              replace: true,
              state: { from: currentPath, reason: 'token_expired' }
            });
          } else {
            navigate('/admin/login', { replace: true });
          }
          return;
        }
        
        // If no admin token but on admin route, redirect to login
        if (!adminToken) {
          navigate('/admin/login', { 
            replace: true,
            state: { from: currentPath }
          });
          return;
        }
      }

      // Check teacher routes
      if (currentPath.startsWith('/teacher')) {
        const teacherToken = tokenManager.getTeacherToken();
        const isTeacherTokenExpired = tokenManager.isTokenExpired('teacher');
        
        if (teacherToken && isTeacherTokenExpired) {
          console.warn('🔒 Teacher token expired, redirecting to login...');
          tokenManager.removeTeacherToken();
          
          navigate('/teacher/login', { 
            replace: true,
            state: { from: currentPath, reason: 'token_expired' }
          });
          return;
        }
        
        if (!teacherToken) {
          navigate('/teacher/login', { 
            replace: true,
            state: { from: currentPath }
          });
          return;
        }
      }

      // Check user routes (protected user routes)
      const protectedUserRoutes = ['/dashboard', '/profile', '/appointments'];
      const isProtectedUserRoute = protectedUserRoutes.some(route => 
        currentPath.startsWith(route)
      );
      
      if (isProtectedUserRoute) {
        const userToken = tokenManager.getUserToken();
        const isUserTokenExpired = tokenManager.isTokenExpired('user');
        
        if (userToken && isUserTokenExpired) {
          console.warn('🔒 User token expired, redirecting to login...');
          tokenManager.removeUserToken();
          
          navigate('/login', { 
            replace: true,
            state: { from: currentPath, reason: 'token_expired' }
          });
          return;
        }
        
        if (!userToken) {
          navigate('/login', { 
            replace: true,
            state: { from: currentPath }
          });
          return;
        }
      }
    };

    // Check immediately
    checkTokenExpiry();

    // Set up periodic checking (every 5 minutes)
    const intervalId = setInterval(checkTokenExpiry, 5 * 60 * 1000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [location.pathname, navigate]);

  return children;
};

export default TokenExpiryHandler;