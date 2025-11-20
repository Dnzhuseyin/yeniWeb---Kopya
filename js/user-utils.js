// User Utilities - Kullanıcı yönetimi için ortak fonksiyonlar
// Tüm öğrenci sayfalarında kullanılabilir

// Cache for user data to avoid repeated Firebase calls
let userDataCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Extract name from email
function extractNameFromEmail(email) {
    const name = email.split('@')[0];
    return name.split('.').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
}

// Load coordinator information from Firebase
async function loadCoordinatorInfo(userEmail) {
    try {
        console.log('👨‍🏫 Koordinatör bilgileri Firebase\'den yükleniyor...');
        
        // Check cache first
        const now = Date.now();
        if (userDataCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
            console.log('📋 Cache\'den koordinatör bilgileri alınıyor');
            return userDataCache;
        }
        
        if (!window.DB) {
            throw new Error('Firebase DB henüz hazır değil');
        }
        
        // Load coordinator profiles from Firebase
        const coordinatorProfilesResult = await DB.load('coordinatorProfiles');
        const coordinatorProfiles = (coordinatorProfilesResult && coordinatorProfilesResult.success && Array.isArray(coordinatorProfilesResult.data)) ? coordinatorProfilesResult.data : [];
        console.log('📄 Firebase coordinator profiles yüklendi:', coordinatorProfiles.length);
        
        const coordinatorProfile = coordinatorProfiles.length > 0 ? coordinatorProfiles.find(p => p.userEmail === userEmail) : null;
        if (coordinatorProfile) {
            console.log('✅ Koordinatör profili bulundu:', coordinatorProfile);
            
            // Cache the result
            userDataCache = coordinatorProfile;
            cacheTimestamp = now;
            
            return coordinatorProfile;
        }
        
        // If not found in coordinator profiles, check regular user profiles
        const userProfilesResult = await DB.load('userProfiles');
        const userProfiles = (userProfilesResult && userProfilesResult.success && Array.isArray(userProfilesResult.data)) ? userProfilesResult.data : [];
        const userProfile = userProfiles.length > 0 ? userProfiles.find(p => p.userEmail === userEmail) : null;
        
        if (userProfile) {
            console.log('✅ Kullanıcı profili bulundu:', userProfile);
            
            // Cache the result
            userDataCache = userProfile;
            cacheTimestamp = now;
            
            return userProfile;
        }
        
        // If no profile found, create a default coordinator profile
        if (userEmail.includes('koordinator') || userEmail.includes('instructor') || userEmail.includes('admin')) {
            console.log('📝 Varsayılan koordinatör profili oluşturuluyor...');
            
            const defaultProfile = {
                userEmail: userEmail,
                firstName: extractNameFromEmail(userEmail).split(' ')[0],
                lastName: extractNameFromEmail(userEmail).split(' ')[1] || '',
                role: 'coordinator',
                title: 'Koordinatör',
                department: 'Eğitim Koordinasyonu',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Save to Firebase
            await DB.save('coordinatorProfiles', defaultProfile);
            console.log('✅ Varsayılan koordinatör profili kaydedildi');
            
            // Cache the result
            userDataCache = defaultProfile;
            cacheTimestamp = now;
            
            return defaultProfile;
        }
        
        return null;
        
    } catch (error) {
        console.warn('⚠️ Koordinatör bilgileri yüklenemedi:', error);
        return null;
    }
}

// Load user information from localStorage or Firebase
async function loadUserInfo() {
    let userEmail = localStorage.getItem('userEmail');
    
    // Eğer localStorage'da kullanıcı bilgisi yoksa, varsayılan değerler ayarla
    if (!userEmail) {
        console.warn('⚠️ localStorage\'da kullanıcı bilgisi yok, varsayılan değerler ayarlanıyor...');
        userEmail = 'ahmet.yilmaz@meb.gov.tr';
        localStorage.setItem('userEmail', userEmail);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userName', 'Ahmet Yılmaz');
        console.log('✅ Varsayılan kullanıcı bilgileri ayarlandı:', userEmail);
    }
    
    console.log('👤 Kullanıcı bilgileri yükleniyor:', userEmail);
    
    try {
        // Check if user is coordinator
        const isCoordinator = userEmail.includes('koordinator') || userEmail.includes('instructor') || userEmail.includes('admin');
        
        if (isCoordinator) {
            // Load coordinator information from Firebase
            const coordinatorInfo = await loadCoordinatorInfo(userEmail);
            
            if (coordinatorInfo) {
                const fullName = `${coordinatorInfo.firstName || ''} ${coordinatorInfo.lastName || ''}`.trim();
                const displayName = coordinatorInfo.title ? 
                    `${coordinatorInfo.title} ${fullName}` : 
                    `Koordinatör ${fullName || extractNameFromEmail(userEmail)}`;
                
                updateUserDisplay(displayName, userEmail);
                return;
            }
        }
        
        // For regular users or if coordinator info not found
        if (window.DB) {
            // Try to load from Firebase first
            const profilesResult = await DB.load('userProfiles');
            console.log('📄 Firebase profiles result:', profilesResult);
            
            let profiles = [];
            if (profilesResult && profilesResult.success) {
                if (Array.isArray(profilesResult.data)) {
                    profiles = profilesResult.data;
                } else if (profilesResult.data && typeof profilesResult.data === 'object') {
                    // If data is an object, convert to array
                    profiles = Object.values(profilesResult.data);
                }
            }
            
            console.log('📄 Firebase profiles yüklendi:', profiles.length);
            
            if (Array.isArray(profiles) && profiles.length > 0) {
                const userProfile = profiles.find(p => p && p.userEmail === userEmail);
                if (userProfile) {
                    console.log('✅ Kullanıcı profili bulundu:', userProfile);
                    const fullName = `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim();
                    const displayName = fullName || extractNameFromEmail(userEmail);
                    updateUserDisplay(displayName, userEmail);
                    return;
                }
            }
        }
        
        // Fallback: extract name from email
        const displayName = extractNameFromEmail(userEmail);
        console.log('📧 E-postadan isim çıkarıldı:', displayName);
        updateUserDisplay(displayName, userEmail);
        
    } catch (error) {
        console.warn('⚠️ Kullanıcı profili yüklenemedi:', error);
        // Fallback: extract name from email
        const displayName = extractNameFromEmail(userEmail);
        updateUserDisplay(displayName, userEmail);
    }
}

// Update user display in UI
function updateUserDisplay(name, email) {
    console.log(`🔄 UI güncelleniyor: ${name} (${email})`);
    
    // Update desktop sidebar
    const userName = document.getElementById('user-name');
    const userEmail = document.getElementById('user-email');
    
    if (userName) {
        userName.textContent = name;
        console.log('✅ Desktop name güncellendi:', name);
    }
    if (userEmail) {
        // user-email elementini boş bırakıyoruz
        userEmail.textContent = '';
        console.log('✅ Desktop email boş bırakıldı');
    }

    // Update mobile sidebar
    const mobileUserName = document.getElementById('mobile-user-name');
    const mobileUserEmail = document.getElementById('mobile-user-email');
    
    if (mobileUserName) {
        mobileUserName.textContent = name;
        console.log('✅ Mobile name güncellendi:', name);
    }
    if (mobileUserEmail) {
        // mobile user-email elementini de boş bırakıyoruz
        mobileUserEmail.textContent = '';
        console.log('✅ Mobile email boş bırakıldı');
    }

    // Update header user name
    const headerUserName = document.getElementById('header-user-name');
    if (headerUserName) {
        headerUserName.textContent = name;
        console.log('✅ Header name güncellendi:', name);
    }

    // Update profile page specific elements
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    
    if (profileName) {
        profileName.textContent = name;
        console.log('✅ Profile name güncellendi:', name);
    }
    if (profileEmail) {
        profileEmail.textContent = email;
        console.log('✅ Profile email güncellendi:', email);
    }

    // Update instructor/coordinator specific elements
    const instructorName = document.getElementById('instructor-name');
    const instructorEmail = document.getElementById('instructor-email');
    
    if (instructorName) {
        instructorName.textContent = name;
        console.log('✅ Instructor name güncellendi:', name);
    }
    if (instructorEmail) {
        instructorEmail.textContent = '';
        console.log('✅ Instructor email boş bırakıldı');
    }

    // Update mobile instructor elements
    const mobileInstructorName = document.getElementById('mobile-instructor-name');
    const mobileInstructorEmail = document.getElementById('mobile-instructor-email');
    
    if (mobileInstructorName) {
        mobileInstructorName.textContent = name;
        console.log('✅ Mobile instructor name güncellendi:', name);
    }
    if (mobileInstructorEmail) {
        mobileInstructorEmail.textContent = '';
        console.log('✅ Mobile instructor email boş bırakıldı');
    }
}

// Wait for Firebase DB to be ready with timeout
async function waitForFirebaseDB() {
    return new Promise((resolve, reject) => {
        const timeout = 10000; // 10 seconds timeout
        const startTime = Date.now();
        
        const checkDB = () => {
            if (window.DB && window.DB.isFirebaseReady !== false) {
                console.log('✅ Firebase Production DB hazır!');
                resolve();
            } else if (Date.now() - startTime > timeout) {
                console.warn('⚠️ Firebase DB timeout, devam ediliyor...');
                resolve(); // Continue without Firebase
            } else {
                console.log('⏳ Firebase Production DB bekleniyor...');
                setTimeout(checkDB, 100); // Check more frequently
            }
        };
        checkDB();
    });
}

// Initialize user info on page load with performance optimizations
async function initializeUserInfo() {
    console.log('🚀 Kullanıcı bilgileri başlatılıyor...');
    
    // Show loading indicator
    showLoadingIndicator();
    
    try {
        // Check if user is logged in - eğer değilse varsayılan ayarla
        let isLoggedIn = localStorage.getItem('isLoggedIn');
        if (isLoggedIn !== 'true') {
            console.log('⚠️ Oturum açılmamış, varsayılan oturum ayarlanıyor...');
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userEmail', 'ahmet.yilmaz@meb.gov.tr');
            localStorage.setItem('userName', 'Ahmet Yılmaz');
            isLoggedIn = 'true';
        }
        
        const userEmail = localStorage.getItem('userEmail');
        console.log('✅ Oturum açık:', userEmail);
        
        // Load user info immediately with cached data if available
        const cachedName = localStorage.getItem('cachedUserName');
        if (cachedName) {
            updateUserDisplay(cachedName, userEmail);
            console.log('⚡ Cached kullanıcı bilgileri gösterildi');
        }
        
        // Wait for Firebase to be ready (with timeout)
        await waitForFirebaseDB();
        
        // Load user information from Firebase
        await loadUserInfo();
        
        console.log('🎉 Kullanıcı bilgileri başlatma tamamlandı');
        return true;
        
    } catch (error) {
        console.error('❌ Kullanıcı bilgileri başlatma hatası:', error);
        
        // Fallback: use email-based name
        const userEmail = localStorage.getItem('userEmail') || 'user@example.com';
        const fallbackName = extractNameFromEmail(userEmail);
        updateUserDisplay(fallbackName, userEmail);
        
        return true; // Continue even with errors
    } finally {
        // Hide loading indicator
        hideLoadingIndicator();
    }
}

// Show loading indicator
function showLoadingIndicator() {
    const indicators = document.querySelectorAll('.user-loading');
    indicators.forEach(indicator => {
        if (indicator) indicator.style.display = 'block';
    });
}

// Hide loading indicator
function hideLoadingIndicator() {
    const indicators = document.querySelectorAll('.user-loading');
    indicators.forEach(indicator => {
        if (indicator) indicator.style.display = 'none';
    });
}

// Clear user data cache
function clearUserCache() {
    userDataCache = null;
    cacheTimestamp = null;
    localStorage.removeItem('cachedUserName');
}

// Export functions for use in other files
if (typeof window !== 'undefined') {
    window.UserUtils = {
        loadUserInfo,
        loadCoordinatorInfo,
        updateUserDisplay,
        waitForFirebaseDB,
        initializeUserInfo,
        extractNameFromEmail,
        clearUserCache
    };
    
    // Listen for Firebase ready event
    window.addEventListener('firebaseReady', (event) => {
        console.log('🔥 Firebase ready event alındı:', event.detail);
        
        // If Firebase is ready and user info hasn't been loaded yet, load it
        if (event.detail.ready && !userDataCache) {
            console.log('⚡ Firebase hazır, kullanıcı bilgileri yükleniyor...');
            loadUserInfo().catch(error => {
                console.warn('⚠️ Firebase ready sonrası kullanıcı bilgisi yüklenemedi:', error);
            });
        }
    });
} 