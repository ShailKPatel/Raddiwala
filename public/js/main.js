// Main JavaScript file for RaddiWala

// Utility functions
const API_BASE = '/api';

// Show notification
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()">&times;</button>
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

// Show loading spinner
function showLoading(element) {
  element.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
  element.disabled = true;
}

// Hide loading spinner
function hideLoading(element, originalText) {
  element.innerHTML = originalText;
  element.disabled = false;
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
}

// Token management
function getToken() {
  // Try to get token from cookie
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'token') {
      return value;
    }
  }
  return null;
}

// Smart navigation to appropriate dashboard
function navigateToHome() {
  const token = getToken();
  if (!token) {
    window.location.href = '/';
    return;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const role = payload.role;

    if (role === 'customer') {
      window.location.href = '/customer/dashboard';
    } else if (role === 'raddiwala') {
      window.location.href = '/raddiwala/dashboard';
    } else {
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Error parsing token:', error);
    window.location.href = '/';
  }
}

// API helper functions
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      credentials: 'include',
      ...options
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Authentication functions
async function sendOTP(email, purpose, role) {
  return await apiCall('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email, purpose, role })
  });
}

async function signup(formData) {
  return await apiCall('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(formData)
  });
}

async function login(formData) {
  return await apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify(formData)
  });
}

async function logout() {
  return await apiCall('/auth/logout', {
    method: 'POST'
  });
}

// Form validation
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePhone(phone) {
  const re = /^[6-9]\d{9}$/;
  return re.test(phone);
}

function validateOTP(otp) {
  const re = /^\d{4}$/;
  return re.test(otp);
}

// File upload helpers
function validateImageFile(file) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only JPEG, PNG, and GIF images are allowed');
  }

  if (file.size > maxSize) {
    throw new Error('File size must be less than 5MB');
  }

  return true;
}

function previewImage(input, previewContainer) {
  const file = input.files[0];
  if (file) {
    try {
      validateImageFile(file);
      
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.maxWidth = '200px';
        img.style.maxHeight = '200px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '5px';
        
        previewContainer.innerHTML = '';
        previewContainer.appendChild(img);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      showNotification(error.message, 'error');
      input.value = '';
    }
  }
}

// Rating component
function createStarRating(rating, interactive = false, onRate = null) {
  const container = document.createElement('div');
  container.className = 'star-rating';
  
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.className = 'star';
    star.innerHTML = i <= rating ? '★' : '☆';
    
    if (interactive) {
      star.style.cursor = 'pointer';
      star.onclick = () => {
        if (onRate) onRate(i);
        // Update visual rating
        container.querySelectorAll('.star').forEach((s, index) => {
          s.innerHTML = index < i ? '★' : '☆';
        });
      };
    }
    
    container.appendChild(star);
  }
  
  return container;
}

// Initialize page-specific functionality
document.addEventListener('DOMContentLoaded', function() {
  // Add notification styles if not already present
  if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
        max-width: 400px;
        animation: slideIn 0.3s ease;
      }
      
      .notification-info { background: #17a2b8; }
      .notification-success { background: #28a745; }
      .notification-warning { background: #ffc107; color: #333; }
      .notification-error { background: #dc3545; }
      
      .notification button {
        background: none;
        border: none;
        color: inherit;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        margin-left: auto;
      }
      
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      .star-rating {
        display: inline-flex;
        gap: 2px;
      }
      
      .star {
        color: #ffc107;
        font-size: 1.2em;
      }
    `;
    document.head.appendChild(style);
  }

  // Handle logout links
  const logoutLinks = document.querySelectorAll('a[href="/logout"]');
  logoutLinks.forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await logout();
        window.location.href = '/';
      } catch (error) {
        showNotification('Logout failed', 'error');
      }
    });
  });

  // Handle form submissions with loading states
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn && !submitBtn.dataset.originalText) {
        submitBtn.dataset.originalText = submitBtn.innerHTML;
        showLoading(submitBtn);
        
        // Reset loading state after form submission
        setTimeout(() => {
          hideLoading(submitBtn, submitBtn.dataset.originalText);
        }, 2000);
      }
    });
  });
});

// Export functions for use in other scripts
window.RaddiWala = {
  showNotification,
  showLoading,
  hideLoading,
  formatDate,
  formatCurrency,
  apiCall,
  sendOTP,
  signup,
  login,
  logout,
  validateEmail,
  validatePhone,
  validateOTP,
  validateImageFile,
  previewImage,
  createStarRating,
  getToken,
  navigateToHome
};
