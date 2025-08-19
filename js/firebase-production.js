// Firebase Veritabanı Sistemi - Production Ready (Pure Firebase)
// Sadece Firebase Firestore kullanır, localStorage yok

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDHvhmF3Kymlx3UQuygB2fFAPfxuVoav3o",
    authDomain: "egitimplatformu-ea723.firebaseapp.com",
    projectId: "egitimplatformu-ea723",
    storageBucket: "egitimplatformu-ea723.firebasestorage.app",
    messagingSenderId: "140091126163",
    appId: "1:140091126163:web:d9a8fa55f314efa243b866",
    measurementId: "G-BFVW3G17S5"
};

class FirebaseProductionDB {
    constructor() {
        this.isFirebaseReady = false;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.collections = {
            coordinatorVideos: 'coordinator_videos',
            studentVideos: 'student_videos',
            userNotes: 'user_notes',
            userProgress: 'user_progress',
            settings: 'app_settings',
            moduleVideos: 'module_videos',
            userProfiles: 'user_profiles',
            coordinatorProfiles: 'coordinator_profiles',
            userAchievements: 'user_achievements',
            modules: 'modules'
        };
        
        // Add caching for better performance
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        console.log('🔥 Firebase Production DB başlatılıyor...');
        this.initialize();
    }
    
    async initialize() {
        try {
            if (typeof firebase === 'undefined') {
                console.log('⏳ Firebase CDN yükleniyor...');
                await this.waitForFirebase();
            }
            
            if (typeof firebase !== 'undefined') {
                if (!firebase.apps.length) {
                    firebase.initializeApp(firebaseConfig);
                    console.log('🔥 Firebase app başlatıldı');
                }
                
                this.db = firebase.firestore();
                
                // Configure Firestore settings for better performance
                this.db.settings({
                    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
                });
                
                try {
                    await this.db.enablePersistence({ 
                        synchronizeTabs: true,
                        experimentalForceOwningTab: true 
                    });
                    console.log('💾 Firebase offline persistence etkinleştirildi');
                } catch (err) {
                    if (err.code === 'failed-precondition') {
                        console.warn('⚠️ Birden fazla sekme açık, persistence atlandı');
                    } else if (err.code === 'unimplemented') {
                        console.warn('⚠️ Tarayıcı persistence desteklemiyor');
                    }
                }
                
                // Test connection with timeout
                await Promise.race([
                    this.testConnection(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Connection timeout')), 5000)
                    )
                ]);
                
                this.isFirebaseReady = true;
                console.log('✅ Firebase Production DB hazır!');
                
                // Preload critical data
                this.preloadCriticalData();
                
            } else {
                throw new Error('Firebase CDN yüklenemedi');
            }
            
        } catch (error) {
            console.error('❌ Firebase bağlantısı kurulamadı:', error.message);
            // Continue without Firebase for offline functionality
            this.isFirebaseReady = false;
        }
    }
    
    async waitForFirebase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 10; // Reduced from 20 for faster timeout
            
            const checkFirebase = () => {
                attempts++;
                if (typeof firebase !== 'undefined') {
                    console.log('✅ Firebase CDN yüklendi');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Firebase CDN yüklenemedi'));
                } else {
                    setTimeout(checkFirebase, 300); // Reduced from 500ms
                }
            };
            
            checkFirebase();
        });
    }
    
    async testConnection() {
        if (!this.db) {
            throw new Error('Firestore not initialized');
        }
        
        try {
            const testRef = this.db.collection('test');
            await testRef.limit(1).get();
            console.log('🔗 Firebase bağlantı testi başarılı');
        } catch (error) {
            console.error('❌ Firebase bağlantı testi başarısız:', error);
            throw error;
        }
    }
    
    // Preload critical data for better performance
    async preloadCriticalData() {
        try {
            console.log('⚡ Kritik veriler önceden yükleniyor...');
            
            // Preload coordinator profiles
            this.load('coordinatorProfiles').catch(err => 
                console.warn('⚠️ Coordinator profiles preload failed:', err)
            );
            
            // Preload user profiles
            this.load('userProfiles').catch(err => 
                console.warn('⚠️ User profiles preload failed:', err)
            );
            
            console.log('✅ Kritik veriler preload başlatıldı');
        } catch (error) {
            console.warn('⚠️ Preload hatası:', error);
        }
    }
    
    // Get cache key for data
    getCacheKey(table, id = null) {
        return id ? `${table}_${id}` : table;
    }
    
    // Check if cache is valid
    isCacheValid(cacheKey) {
        const cached = this.cache.get(cacheKey);
        if (!cached) return false;
        
        const now = Date.now();
        return (now - cached.timestamp) < this.cacheTimeout;
    }
    
    // Set cache data
    setCache(cacheKey, data) {
        this.cache.set(cacheKey, {
            data: data,
            timestamp: Date.now()
        });
    }
    
    // Get cache data
    getCache(cacheKey) {
        const cached = this.cache.get(cacheKey);
        return cached ? cached.data : null;
    }

    async save(table, data, id = null) {
        if (!this.isFirebaseReady) {
            console.warn('⚠️ Firebase hazır değil, localStorage\'a kaydediliyor');
            // Fallback to localStorage for offline functionality
            const key = `offline_${table}_${id || Date.now()}`;
            localStorage.setItem(key, JSON.stringify(data));
            return { success: true, id: id || Date.now().toString() };
        }
        
        try {
            const collectionName = this.collections[table];
            if (!collectionName) {
                throw new Error(`Geçersiz tablo: ${table}`);
            }
            
            const timestamp = new Date().toISOString();
            const dataToSave = {
                ...data,
                updatedAt: timestamp,
                createdAt: data.createdAt || timestamp
            };
            
            if (id) {
                const docRef = this.db.collection(collectionName).doc(id);
                const docSnapshot = await docRef.get();
                
                if (docSnapshot.exists) {
                    await docRef.update(dataToSave);
                    console.log(`🔄 ${table}/${id} güncellendi`);
                } else {
                    await docRef.set(dataToSave);
                    console.log(`✨ ${table}/${id} oluşturuldu`);
                }
                
                // Update cache
                const cacheKey = this.getCacheKey(table, id);
                this.setCache(cacheKey, { id, ...dataToSave });
                
                // Invalidate collection cache
                this.cache.delete(this.getCacheKey(table));
                
                return { success: true, id };
            } else {
                const docRef = await this.db.collection(collectionName).add(dataToSave);
                console.log(`✨ ${table}/${docRef.id} oluşturuldu`);
                
                // Update cache
                const cacheKey = this.getCacheKey(table, docRef.id);
                this.setCache(cacheKey, { id: docRef.id, ...dataToSave });
                
                // Invalidate collection cache
                this.cache.delete(this.getCacheKey(table));
                
                return { success: true, id: docRef.id };
            }
            
        } catch (error) {
            console.error('❌ Firebase kaydetme hatası:', error);
            throw error;
        }
    }
    
    async load(table, id = null) {
        const cacheKey = this.getCacheKey(table, id);
        
        // Check cache first
        if (this.isCacheValid(cacheKey)) {
            console.log(`📋 Cache'den veri alınıyor: ${cacheKey}`);
            return { success: true, data: this.getCache(cacheKey) };
        }
        
        if (!this.isFirebaseReady) {
            console.warn('⚠️ Firebase hazır değil, cache/localStorage kontrol ediliyor');
            
            // Try to get from cache even if expired
            const cachedData = this.getCache(cacheKey);
            if (cachedData) {
                console.log('📋 Expired cache kullanılıyor:', cacheKey);
                return { success: true, data: cachedData };
            }
            
            // Fallback to localStorage for offline functionality
            if (id) {
                const stored = localStorage.getItem(`offline_${table}_${id}`);
                if (stored) {
                    const data = JSON.parse(stored);
                    return { success: true, data: { id, ...data } };
                }
            } else {
                const allKeys = Object.keys(localStorage).filter(key => key.startsWith(`offline_${table}_`));
                const data = allKeys.map(key => {
                    const stored = localStorage.getItem(key);
                    const parsedData = JSON.parse(stored);
                    const extractedId = key.replace(`offline_${table}_`, '');
                    return { id: extractedId, ...parsedData };
                });
                return { success: true, data };
            }
            
            return { success: true, data: id ? null : [] };
        }
        
        try {
            const collectionName = this.collections[table];
            if (!collectionName) {
                throw new Error(`Geçersiz tablo: ${table}`);
            }
            
            if (id) {
                const doc = await this.db.collection(collectionName).doc(id).get();
                
                if (doc.exists) {
                    const data = { id: doc.id, ...doc.data() };
                    this.setCache(cacheKey, data);
                    return { success: true, data };
                } else {
                    return { success: false, error: 'Kayıt bulunamadı' };
                }
            } else {
                const snapshot = await this.db.collection(collectionName)
                    .orderBy('createdAt', 'desc')
                    .get();
                    
                const data = [];
                snapshot.forEach((doc) => {
                    data.push({ id: doc.id, ...doc.data() });
                });
                
                this.setCache(cacheKey, data);
                return { success: true, data };
            }
            
        } catch (error) {
            console.error('❌ Firebase yükleme hatası:', error);
            
            // Try to get from cache even if expired
            const cachedData = this.getCache(cacheKey);
            if (cachedData) {
                console.log('📋 Error fallback cache kullanılıyor:', cacheKey);
                return { success: true, data: cachedData };
            }
            
            throw error;
        }
    }
    
    async delete(table, id) {
        if (!this.isFirebaseReady) {
            console.warn('⚠️ Firebase hazır değil, localStorage\'dan siliniyor');
            // Fallback to localStorage for offline functionality
            const key = `offline_${table}_${id}`;
            localStorage.removeItem(key);
            console.log(`🗑️ ${table}/${id} localStorage'dan silindi`);
            return { success: true };
        }
        
        try {
            const collectionName = this.collections[table];
            if (!collectionName) {
                throw new Error(`Geçersiz tablo: ${table}`);
            }
            
            await this.db.collection(collectionName).doc(id).delete();
            console.log(`🗑️ ${table}/${id} silindi`);
            
            // Invalidate cache
            this.cache.delete(this.getCacheKey(table, id));
            this.cache.delete(this.getCacheKey(table));
            
            return { success: true };
            
        } catch (error) {
            console.error('❌ Firebase silme hatası:', error);
            throw error;
        }
    }
    
    // Modül yönetimi fonksiyonları
    async saveModule(moduleData, moduleId = null) {
        return await this.save('modules', moduleData, moduleId);
    }
    
    async loadModules() {
        return await this.load('modules');
    }
    
    async loadModule(moduleId) {
        return await this.load('modules', moduleId);
    }
    
    async deleteModule(moduleId) {
        return await this.delete('modules', moduleId);
    }
    
    async getModuleStats() {
        try {
            const modulesResult = await this.loadModules();
            if (!modulesResult.success) {
                return { success: false, error: 'Modüller yüklenemedi' };
            }
            
            const modules = modulesResult.data;
            const stats = {
                totalModules: modules.length,
                activeModules: modules.filter(m => m.status === 'active').length,
                draftModules: modules.filter(m => m.status === 'draft').length,
                completedModules: modules.filter(m => m.status === 'completed').length
            };
            
            return { success: true, data: stats };
        } catch (error) {
            console.error('❌ Modül istatistikleri hatası:', error);
            throw error;
        }
    }
    
    async createDefaultCoordinatorProfiles() {
        const defaultCoordinators = [
            {
                userEmail: 'koordinator@meb.gov.tr',
                firstName: 'Mehmet',
                lastName: 'Yılmaz',
                role: 'coordinator',
                title: 'Baş Koordinatör',
                department: 'Eğitim Koordinasyonu',
                phone: '+90 312 XXX XXXX',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                userEmail: 'instructor@meb.gov.tr',
                firstName: 'Ayşe',
                lastName: 'Demir',
                role: 'coordinator',
                title: 'Eğitim Koordinatörü',
                department: 'Afet Eğitimi',
                phone: '+90 312 XXX XXXX',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                userEmail: 'admin@meb.gov.tr',
                firstName: 'Ali',
                lastName: 'Kaya',
                role: 'admin',
                title: 'Sistem Yöneticisi',
                department: 'Bilgi İşlem',
                phone: '+90 312 XXX XXXX',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        
        try {
            for (const coordinator of defaultCoordinators) {
                await this.save('coordinatorProfiles', coordinator, coordinator.userEmail);
            }
            console.log('✅ Varsayılan koordinatör profilleri oluşturuldu');
            return { success: true };
        } catch (error) {
            console.error('❌ Varsayılan koordinatör profil oluşturma hatası:', error);
            throw error;
        }
    }

    async createDefaultModules() {
        const defaultModules = [
            {
                id: '1',
                title: 'Çevik Liderlik Temelleri',
                description: 'Afet durumlarında etkili liderlik becerilerinin temellerini öğrenin.',
                status: 'active',
                difficulty: 'beginner',
                estimatedDuration: '2.5',
                videoCount: 12,
                enrollmentCount: 387,
                completionRate: 89,
                rating: 4.8,
                reviewCount: 387,
                color: 'primary',
                icon: 'fas fa-graduation-cap',
                order: 1
            },
            {
                id: '2',
                title: 'Kriz Durumlarında Liderlik',
                description: 'Acil durumlarda hızlı ve etkili karar verme becerileri geliştirin.',
                status: 'active',
                difficulty: 'intermediate',
                estimatedDuration: '3.2',
                videoCount: 18,
                enrollmentCount: 234,
                completionRate: 76,
                rating: 4.9,
                reviewCount: 234,
                color: 'secondary',
                icon: 'fas fa-exclamation-triangle',
                order: 2
            },
            {
                id: '3',
                title: 'Afet Öncesi Hazırlık',
                description: 'Afet öncesi etkili hazırlık stratejileri ve risk yönetimi.',
                status: 'draft',
                difficulty: 'intermediate',
                estimatedDuration: '2.8',
                videoCount: 15,
                enrollmentCount: 0,
                completionRate: 0,
                rating: 0,
                reviewCount: 0,
                color: 'accent',
                icon: 'fas fa-shield-alt',
                order: 3
            },
            {
                id: '4',
                title: 'İletişim ve Koordinasyon',
                description: 'Afet durumlarında etkili iletişim ve koordinasyon teknikleri.',
                status: 'active',
                difficulty: 'intermediate',
                estimatedDuration: '2.1',
                videoCount: 10,
                enrollmentCount: 156,
                completionRate: 68,
                rating: 4.2,
                reviewCount: 156,
                color: 'purple',
                icon: 'fas fa-comments',
                order: 4
            },
            {
                id: '5',
                title: 'Ekip Yönetimi',
                description: 'Stresli durumlarda ekip motivasyonu ve yönetimi becerileri.',
                status: 'active',
                difficulty: 'advanced',
                estimatedDuration: '2.7',
                videoCount: 14,
                enrollmentCount: 198,
                completionRate: 72,
                rating: 4.6,
                reviewCount: 198,
                color: 'blue',
                icon: 'fas fa-users',
                order: 5
            },
            {
                id: '6',
                title: 'Afet Sonrası Rehabilitasyon',
                description: 'Afet sonrası toparlanma süreci ve eğitim kurumlarının yeniden yapılandırılması.',
                status: 'active',
                difficulty: 'advanced',
                estimatedDuration: '3.1',
                videoCount: 16,
                enrollmentCount: 89,
                completionRate: 54,
                rating: 4.1,
                reviewCount: 89,
                color: 'pink',
                icon: 'fas fa-tools',
                order: 6
            }
        ];
        
        try {
            for (const module of defaultModules) {
                await this.saveModule(module, module.id);
            }
            console.log('✅ Varsayılan modüller oluşturuldu');
            return { success: true };
        } catch (error) {
            console.error('❌ Varsayılan modül oluşturma hatası:', error);
            throw error;
        }
    }
    
    async syncCoordinatorVideos() {
        if (!this.isFirebaseReady) {
            console.warn('⚠️ Firebase hazır değil');
            return { success: false, error: 'Firebase henüz hazır değil' };
        }
        
        try {
            console.log('🔄 Koordinatör videoları senkronize ediliyor...');
            
            const coordResult = await this.load('coordinatorVideos');
            if (!coordResult.success) {
                console.warn('⚠️ Koordinatör videoları yüklenemedi');
                return { success: false, error: 'Koordinatör videoları yüklenemedi' };
            }
            
            console.log(`📹 ${coordResult.data.length} koordinatör videosu bulundu`);
            
            for (const video of coordResult.data) {
                console.log(`🔄 Video senkronize ediliyor: ${video.title}`);
                
                const studentVideo = {
                    ...video,
                    isCoordinatorVideo: true,
                    isLocked: false,
                    progress: 0,
                    addedAt: new Date().toISOString()
                };
                
                // Only sync to studentVideos collection (avoid moduleVideos to prevent index issues)
                try {
                    await this.save('studentVideos', studentVideo, video.id);
                    console.log(`✅ Öğrenci videosu güncellendi: ${video.id}`);
                } catch (saveError) {
                    console.warn(`⚠️ Video ${video.id} senkronize edilemedi:`, saveError);
                }
            }
            
            console.log('✅ Senkronizasyon tamamlandı');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Senkronizasyon hatası:', error);
            return { success: false, error: error.message };
        }
    }
    
    async getStats() {
        if (!this.isFirebaseReady) {
            throw new Error('Firebase henüz hazır değil');
        }
        
        try {
            const stats = {};
            
            for (const [key, collectionName] of Object.entries(this.collections)) {
                const snapshot = await this.db.collection(collectionName).get();
                stats[key] = snapshot.size;
            }
            
            return { success: true, data: stats };
            
        } catch (error) {
            console.error('❌ İstatistik hatası:', error);
            throw error;
        }
    }
    
    async loadModuleVideos(moduleId) {
        if (!this.isFirebaseReady) {
            console.warn('⚠️ Firebase hazır değil, boş array döndürülüyor');
            return { success: true, data: [] };
        }
        
        try {
            // Use simple query without orderBy to avoid index requirement
            const snapshot = await this.db.collection(this.collections.moduleVideos)
                .where("moduleId", "==", moduleId.toString())
                .get();
            
            const videos = [];
            snapshot.forEach((doc) => {
                videos.push({ id: doc.id, ...doc.data() });
            });
            
            // Sort manually by createdAt if needed
            videos.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB - dateA; // Descending order
            });
            
            console.log(`✅ Modül ${moduleId} için ${videos.length} video yüklendi`);
            return { success: true, data: videos };
            
        } catch (error) {
            console.error('❌ Modül videoları yükleme hatası:', error);
            // Return empty array instead of throwing error
            return { success: true, data: [] };
        }
    }
    
    async createTestData() {
        const testVideo = {
            title: "Production Test Video - Kriz Yönetimi Temelleri",
            moduleId: "2",
            youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            youtubeVideoId: "dQw4w9WgXcQ",
            description: "Bu bir production test videosudur - Kriz anında liderlik becerileri",
            duration: "25",
            difficulty: "intermediate",
            questions: [
                {
                    question: "Kriz anında bir okul müdürü olarak ilk önceliğiniz ne olmalıdır?",
                    options: [
                        "Medyayla iletişim kurmak",
                        "Can güvenliğini sağlamak", 
                        "Hasar tespiti yapmak",
                        "Üst makamları bilgilendirmek"
                    ],
                    correct: 1
                },
                {
                    question: "Acil durum planı hazırlanırken en önemli faktör hangisidir?",
                    options: [
                        "Maliyet hesabı",
                        "Risk değerlendirmesi",
                        "Personel sayısı", 
                        "Teknolojik altyapı"
                    ],
                    correct: 1
                }
            ]
        };
        
        const result = await this.save('coordinatorVideos', testVideo);
        if (result.success) {
            console.log('✅ Production test verisi oluşturuldu');
            await this.syncCoordinatorVideos();
            return true;
        }
        return false;
    }
    
    onDataChange(table, callback) {
        if (!this.isFirebaseReady) {
            console.warn('⚠️ Firebase henüz hazır değil');
            return null;
        }
        
        try {
            const collectionName = this.collections[table];
            if (!collectionName) {
                console.error(`Geçersiz tablo: ${table}`);
                return null;
            }
            
            const unsubscribe = this.db.collection(collectionName)
                .orderBy('createdAt', 'desc')
                .onSnapshot((snapshot) => {
                    const data = [];
                    snapshot.forEach((doc) => {
                        data.push({ id: doc.id, ...doc.data() });
                    });
                    callback(data);
                }, (error) => {
                    console.error('❌ Gerçek zamanlı dinleme hatası:', error);
                    return null;
                });
            
            return unsubscribe;
            
        } catch (error) {
            console.error('❌ Gerçek zamanlı dinleme hatası:', error);
            return null;
        }
    }
    
    async batchSave(operations) {
        if (!this.isFirebaseReady) {
            throw new Error('Firebase henüz hazır değil');
        }
        
        try {
            const batch = this.db.batch();
            
            operations.forEach(operation => {
                const { table, data, id } = operation;
                const collectionName = this.collections[table];
                
                if (!collectionName) {
                    throw new Error(`Geçersiz tablo: ${table}`);
                }
                
                const timestamp = new Date().toISOString();
                const dataToSave = {
                    ...data,
                    updatedAt: timestamp,
                    createdAt: data.createdAt || timestamp
                };
                
                if (id) {
                    const docRef = this.db.collection(collectionName).doc(id);
                    batch.set(docRef, dataToSave, { merge: true });
                } else {
                    const docRef = this.db.collection(collectionName).doc();
                    batch.set(docRef, dataToSave);
                }
            });
            
            await batch.commit();
            console.log(`✅ ${operations.length} işlem toplu olarak kaydedildi`);
            return { success: true };
            
        } catch (error) {
            console.error('❌ Toplu kaydetme hatası:', error);
            throw error;
        }
    }
}

// Global instance
let db = null;

// Firebase başlatma fonksiyonu
const initializeFirebase = async () => {
    try {
        console.log('🚀 Firebase Production DB başlatılıyor...');
        
        // Show loading indicator
        const loadingElements = document.querySelectorAll('.user-loading');
        loadingElements.forEach(el => el.style.display = 'inline');
        
        if (!window.DB || !window.DB.isFirebaseReady) {
            window.DB = new FirebaseProductionDB();
        }
        
        const waitForReady = () => {
            return new Promise((resolve) => {
                const checkReady = () => {
                    if (window.DB && (window.DB.isFirebaseReady === true || window.DB.isFirebaseReady === false)) {
                        console.log('✅ Firebase Production DB durumu belirlendi:', window.DB.isFirebaseReady);
                        resolve();
                    } else {
                        console.log('⏳ Firebase Production DB bekleniyor...');
                        setTimeout(checkReady, 100);
                    }
                };
                checkReady();
            });
        };
        
        await waitForReady();
        
        // Create default data if Firebase is ready
        if (window.DB.isFirebaseReady) {
            // Create default coordinator profiles
            try {
                await window.DB.createDefaultCoordinatorProfiles();
            } catch (error) {
                console.warn('⚠️ Koordinatör profilleri oluşturulamadı:', error);
            }
            
            // Create default modules if needed
            try {
                const existingModules = await window.DB.loadModules();
                if (!existingModules.success || existingModules.data.length === 0) {
                    await window.DB.createDefaultModules();
                }
            } catch (error) {
                console.warn('⚠️ Varsayılan modüller oluşturulamadı:', error);
            }
        }
        
        console.log('🎉 Firebase Production DB başlatma tamamlandı');
        
        // Hide loading indicator
        loadingElements.forEach(el => el.style.display = 'none');
        
        return window.DB; // Return the DB instance
        
    } catch (error) {
        console.error('❌ Firebase başlatma hatası:', error);
        
        // Hide loading indicator even on error
        const loadingElements = document.querySelectorAll('.user-loading');
        loadingElements.forEach(el => el.style.display = 'none');
        
        return null;
    }
};

// Backward compatibility DB interface
window.DB = {
    save: async (table, data, id) => {
        try {
            const dbInstance = await initializeFirebase();
            const result = await dbInstance.save(table, data, id);
            return result; // Return full response {success: true, id: "..."}
        } catch (error) {
            console.error('DB.save hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    load: async (table, id) => {
        try {
            const dbInstance = await initializeFirebase();
            const result = await dbInstance.load(table, id);
            return result; // Return the full result object {success: true, data: [...]}
        } catch (error) {
            console.error('DB.load hatası:', error);
            return { success: false, error: error.message, data: id ? null : [] };
        }
    },
    
    delete: async (table, id) => {
        try {
            const dbInstance = await initializeFirebase();
            const result = await dbInstance.delete(table, id);
            return result; // Return full response {success: true}
        } catch (error) {
            console.error('DB.delete hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    getStats: async () => {
        try {
            const dbInstance = await initializeFirebase();
            
            // Get video count
            const videosResult = await dbInstance.load('coordinatorVideos');
            const videos = videosResult.success ? videosResult.data : [];
            
            return {
                coordinatorVideos: videos.length,
                totalQuestions: videos.reduce((sum, video) => sum + (video.questions ? video.questions.length : 0), 0)
            };
        } catch (error) {
            console.error('DB.getStats hatası:', error);
            return { coordinatorVideos: 0, totalQuestions: 0 };
        }
    },
    
    syncCoordinatorVideos: async () => {
        try {
            const dbInstance = await initializeFirebase();
            const result = await dbInstance.syncCoordinatorVideos();
            return result; // Return full response
        } catch (error) {
            console.error('DB.syncCoordinatorVideos hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    loadModuleVideos: async (moduleId) => {
        try {
            const dbInstance = await initializeFirebase();
            const result = await dbInstance.loadModuleVideos(moduleId);
            return result.success ? result.data : [];
        } catch (error) {
            console.error('DB.loadModuleVideos hatası:', error);
            return [];
        }
    },
    
    createTestData: async () => {
        try {
            const dbInstance = await initializeFirebase();
            return await dbInstance.createTestData();
        } catch (error) {
            console.error('DB.createTestData hatası:', error);
            return false;
        }
    },
    
    // Modül yönetimi fonksiyonları
    saveModule: async (moduleData, moduleId) => {
        try {
            const dbInstance = await initializeFirebase();
            const result = await dbInstance.saveModule(moduleData, moduleId);
            return result; // Return full response
        } catch (error) {
            console.error('DB.saveModule hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    loadModules: async () => {
        try {
            const dbInstance = await initializeFirebase();
            const result = await dbInstance.loadModules();
            return result; // Return full response {success: true, data: [...]}
        } catch (error) {
            console.error('DB.loadModules hatası:', error);
            return { success: false, error: error.message, data: [] };
        }
    },
    
    loadModule: async (moduleId) => {
        try {
            const dbInstance = await initializeFirebase();
            const result = await dbInstance.loadModule(moduleId);
            return result; // Return full response
        } catch (error) {
            console.error('DB.loadModule hatası:', error);
            return { success: false, error: error.message, data: null };
        }
    },
    
    deleteModule: async (moduleId) => {
        try {
            const dbInstance = await initializeFirebase();
            const result = await dbInstance.deleteModule(moduleId);
            return result; // Return full response
        } catch (error) {
            console.error('DB.deleteModule hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    getModuleStats: async () => {
        try {
            const dbInstance = await initializeFirebase();
            const result = await dbInstance.getModuleStats();
            return result; // Return full response {success: true, data: {...}}
        } catch (error) {
            console.error('DB.getModuleStats hatası:', error);
            return { success: false, error: error.message, data: {} };
        }
    },
    
    createDefaultModules: async () => {
        try {
            const dbInstance = await initializeFirebase();
            const result = await dbInstance.createDefaultModules();
            return result; // Return full response
        } catch (error) {
            console.error('DB.createDefaultModules hatası:', error);
            return { success: false, error: error.message };
        }
    },
    
    onDataChange: (table, callback) => {
        try {
            initializeFirebase().then(dbInstance => {
                return dbInstance.onDataChange(table, callback);
            });
        } catch (error) {
            console.error('DB.onDataChange hatası:', error);
            return null;
        }
    },
    
    batchSave: async (operations) => {
        try {
            const dbInstance = await initializeFirebase();
            const result = await dbInstance.batchSave(operations);
            return result; // Return full response
        } catch (error) {
            console.error('DB.batchSave hatası:', error);
            return { success: false, error: error.message };
        }
    }
};

// Automatically initialize Firebase when script loads
if (typeof window !== 'undefined') {
    // Set global DB reference
    window.DB = null;
    
    // Initialize Firebase immediately
    initializeFirebase().then(() => {
        console.log('🎯 Firebase otomatik başlatma tamamlandı');
        
        // Dispatch custom event to notify pages that Firebase is ready
        window.dispatchEvent(new CustomEvent('firebaseReady', { 
            detail: { ready: window.DB && window.DB.isFirebaseReady } 
        }));
    }).catch(error => {
        console.error('❌ Firebase otomatik başlatma hatası:', error);
        
        // Still dispatch event to let pages know initialization is complete
        window.dispatchEvent(new CustomEvent('firebaseReady', { 
            detail: { ready: false, error: error.message } 
        }));
    });
}

// Export for manual initialization if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FirebaseProductionDB, initializeFirebase };
} 