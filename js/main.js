// Çevik Liderlik Eğitim Platformu - Ana JavaScript

// Platform başlatma
document.addEventListener('DOMContentLoaded', function() {
    initializePlatform();
});

// Platform başlatma fonksiyonu
function initializePlatform() {
    console.log('🎯 Çevik Liderlik Eğitim Platformu başlatılıyor...');
    
    // Navbar ve menu kontrolü
    initializeNavigation();
    
    // Progress bar animasyonları
    initializeProgressBars();
    
    // Notification sistemi
    initializeNotifications();
    
    // Video oynatıcı kontrolü
    initializeVideoPlayers();
    
    // Smooth scroll
    initializeSmoothScroll();
    
    // Loading states
    initializeLoadingStates();
    
    // Menü görünürlük koruması başlat
    startMenuVisibilityGuard();
    
    console.log('✅ Platform başarıyla yüklendi!');
}

// Navigation ve mobile menu kontrolü
function initializeNavigation() {
    // Mobile menu toggle
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileSidebar = document.getElementById('mobile-sidebar-overlay');
    const closeMobileMenu = document.getElementById('close-mobile-menu');
    
    if (mobileMenuButton && mobileSidebar) {
        mobileMenuButton.addEventListener('click', function() {
            mobileSidebar.classList.toggle('hidden');
            document.body.classList.toggle('overflow-hidden');
        });
    }
    
    if (closeMobileMenu && mobileSidebar) {
        closeMobileMenu.addEventListener('click', function() {
            mobileSidebar.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        });
    }
    
    // Sidebar overlay click to close
    if (mobileSidebar) {
        mobileSidebar.addEventListener('click', function(e) {
            if (e.target === mobileSidebar) {
                mobileSidebar.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
            }
        });
    }
    
    // Menü linklerini koru - basit yaklaşım
    keepMenuLinksVisible();
    
    // Active nav item highlighting
    highlightActiveNavItem();
}

// Menü linklerini sürekli görünür tut - basit
function keepMenuLinksVisible() {
    // Tüm menü linklerini bul
    const menuLinks = document.querySelectorAll('aside nav a, #mobile-sidebar-overlay nav a');
    
    // Her linki zorla görünür yap
    menuLinks.forEach(link => {
        // CSS class'ları temizle
        link.classList.remove('hidden', 'd-none', 'invisible');
        
        // Görünürlük garantisi
        link.style.display = 'flex';
        link.style.visibility = 'visible';
        link.style.opacity = '1';
    });
    
    // Nav container'ları da koru
    const navs = document.querySelectorAll('aside nav, #mobile-sidebar-overlay nav');
    navs.forEach(nav => {
        nav.style.display = 'block';
        nav.style.visibility = 'visible';
        nav.style.opacity = '1';
    });
}

// Progress bar animasyonları
function initializeProgressBars() {
    const progressBars = document.querySelectorAll('[style*="width:"]');
    
    progressBars.forEach(bar => {
        // Intersection Observer ile animasyon tetikleme
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('progress-bar');
                    animateProgressBar(entry.target);
                }
            });
        });
        
        observer.observe(bar);
    });
}

// Progress bar animasyonu
function animateProgressBar(element) {
    const targetWidth = element.style.width;
    element.style.width = '0%';
    
    setTimeout(() => {
        element.style.width = targetWidth;
    }, 200);
}

// Notification sistemi
function initializeNotifications() {
    // Sayfa yüklendiğinde notification varsa göster
    const notifications = document.querySelectorAll('.notification');
    
    notifications.forEach((notification, index) => {
        setTimeout(() => {
            notification.classList.add('fade-in');
        }, index * 100);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            hideNotification(notification);
        }, 5000);
    });
}

// Notification gösterme
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} fade-in`;
    notification.innerHTML = `
        <div class="flex items-center justify-between">
            <span>${message}</span>
            <button onclick="hideNotification(this.parentElement.parentElement)" class="ml-4 text-lg">×</button>
        </div>
    `;
    
    // Sayfanın üstüne ekle
    const container = document.querySelector('.max-w-7xl') || document.body;
    container.insertBefore(notification, container.firstChild);
    
    // Auto-hide
    setTimeout(() => {
        hideNotification(notification);
    }, 5000);
}

// Notification gizleme
function hideNotification(element) {
    if (element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            element.remove();
        }, 300);
    }
}

// Video oynatıcı kontrolü
function initializeVideoPlayers() {
    const videoContainers = document.querySelectorAll('.video-container');
    
    videoContainers.forEach(container => {
        const iframe = container.querySelector('iframe');
        if (iframe) {
            // Loading state
            container.classList.add('loading');
            
            iframe.addEventListener('load', function() {
                container.classList.remove('loading');
                console.log('📹 Video yüklendi');
            });
        }
    });
}

// Smooth scroll
function initializeSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Loading states
function initializeLoadingStates() {
    // Sayfa yüklenirken loading göster
    const loadingElements = document.querySelectorAll('.loading');
    
    setTimeout(() => {
        loadingElements.forEach(element => {
            element.classList.remove('loading');
        });
    }, 1000);
}

// Modül accordion kontrolü
function toggleModule(element) {
    const content = element.nextElementSibling;
    const icon = element.querySelector('i');
    
    if (content) {
        content.classList.toggle('hidden');
        
        // Icon döndürme
        if (icon) {
            if (content.classList.contains('hidden')) {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-right');
            } else {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-down');
            }
        }
    }
}

// Search fonksiyonu
function searchContent(query) {
    console.log(`🔍 Arama yapılıyor: ${query}`);
    
    // Basit arama implementasyonu
    const searchableElements = document.querySelectorAll('[data-searchable]');
    
    searchableElements.forEach(element => {
        const text = element.textContent.toLowerCase();
        const isMatch = text.includes(query.toLowerCase());
        
        if (isMatch) {
            element.style.display = 'block';
            highlightText(element, query);
        } else {
            element.style.display = 'none';
        }
    });
}

// Metin vurgulama
function highlightText(element, query) {
    const text = element.innerHTML;
    const regex = new RegExp(query, 'gi');
    const highlightedText = text.replace(regex, `<mark class="bg-yellow-200">$&</mark>`);
    element.innerHTML = highlightedText;
}

// Form validation
function validateForm(formElement) {
    const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            showFieldError(input, 'Bu alan zorunludur');
            isValid = false;
        } else {
            clearFieldError(input);
        }
    });
    
    return isValid;
}

// Field error gösterme
function showFieldError(input, message) {
    clearFieldError(input);
    
    input.classList.add('border-red-500');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'text-red-500 text-sm mt-1';
    errorDiv.textContent = message;
    errorDiv.setAttribute('data-error', 'true');
    
    input.parentNode.insertBefore(errorDiv, input.nextSibling);
}

// Field error temizleme
function clearFieldError(input) {
    input.classList.remove('border-red-500');
    const errorElement = input.parentNode.querySelector('[data-error="true"]');
    if (errorElement) {
        errorElement.remove();
    }
}

// Local storage helpers
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`💾 Data saved: ${key}`);
    } catch (error) {
        console.error('Storage save error:', error);
    }
}

function loadFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Storage load error:', error);
        return null;
    }
}

// Platform durumu kaydetme
function savePlatformState() {
    const state = {
        currentPage: window.location.pathname,
        timestamp: Date.now(),
        userPreferences: {
            theme: 'default',
            language: 'tr'
        }
    };
    
    saveToStorage('platformState', state);
}

// Platform durumu yükleme
function loadPlatformState() {
    return loadFromStorage('platformState');
}

// Sayfa çıkışında durumu kaydet
window.addEventListener('beforeunload', savePlatformState);

// Utility fonksiyonlar
const Utils = {
    // Tarih formatlama
    formatDate: function(date) {
        return new Intl.DateTimeFormat('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(date));
    },
    
    // Süre formatlama (dakika:saniye)
    formatDuration: function(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    },
    
    // URL parameter alma
    getUrlParameter: function(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    },
    
    // Scroll to top
    scrollToTop: function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    },
    
    // Element visible kontrolü
    isElementVisible: function(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
};

// Global error handler
window.addEventListener('error', function(e) {
    console.error('Platform Error:', e.error);
    showNotification('Bir hata oluştu. Sayfa yeniden yüklenecek.', 'error');
    
    // Ciddi hatalarda sayfa yenile
    setTimeout(() => {
        window.location.reload();
    }, 3000);
});

// Console welcome message
console.log(`
🎓 Çevik Liderlik Eğitim Platformu
📍 Afet Bölgesi Okul Yöneticileri
🏫 11 Şehir - Özel Tasarım
🚀 v1.0 - Hazır!
`);

// Export functions for external use
window.PlatformUtils = Utils;
window.showNotification = showNotification;
window.hideNotification = hideNotification;
window.toggleModule = toggleModule;
window.searchContent = searchContent;

// Menü görünürlüğünü koruma sistemi - basit
function startMenuVisibilityGuard() {
    // Basit interval - her 500ms'de kontrol et
    setInterval(() => {
        keepMenuLinksVisible();
    }, 500);
    
    // Sayfa yüklendiğinde hemen çalıştır
    setTimeout(() => {
        keepMenuLinksVisible();
    }, 100);
}

// Aktif navigasyon öğesini vurgula
function highlightActiveNavItem() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes(currentPage)) {
            link.classList.add('nav-active');
        }
    });
}

// Global logout function for all pages
function logout() {
    // Oturum bilgilerini temizle
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('loginTime');
    
    console.log('Çıkış yapıldı');
    // Direkt login sayfasına yönlendir
    window.location.href = 'login.html';
}

// Setup logout functionality for all pages
document.addEventListener('DOMContentLoaded', function() {
    // Replace all logout links with buttons
    const logoutLinks = document.querySelectorAll('a[href="index.html"]');
    logoutLinks.forEach(function(link) {
        // Check if this is actually a logout link (contains logout icon or text)
        const isLogoutLink = link.innerHTML.includes('fa-sign-out-alt') || 
                           link.innerHTML.includes('Çıkış Yap') ||
                           link.textContent.includes('Çıkış');
        
        if (isLogoutLink) {
            // Convert to button
            const button = document.createElement('button');
            button.className = link.className;
            button.innerHTML = link.innerHTML;
            button.onclick = logout;
            
            // Replace the link with button
            link.parentNode.replaceChild(button, link);
        }
    });
}); 