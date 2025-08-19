// Gemini AI API Integration
class GeminiAPI {
    constructor() {
        this.apiKey = 'AIzaSyD6K14NdNGB8zlh7KRzAd9TDDibxBAJU2Q';
        this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    }
    
    async generateContent(prompt, context = '') {
        try {
            const requestBody = {
                contents: [{
                    parts: [{
                        text: context ? `${context}\n\n${prompt}` : prompt
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            };
            
            const response = await fetch(`${this.baseURL}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                return {
                    success: true,
                    text: data.candidates[0].content.parts[0].text
                };
            } else {
                throw new Error('Geçersiz API yanıtı');
            }
            
        } catch (error) {
            console.error('❌ Gemini API hatası:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Çevik liderlik eğitimi için özel promptlar
    async generateLeadershipAdvice(situation) {
        const context = `Sen bir çevik liderlik uzmanısın. Afet bölgesi okul yöneticilerine çevik liderlik konusunda tavsiyelerde bulunuyorsun. Türkçe yanıt ver.`;
        const prompt = `Bu durumda çevik liderlik prensiplerini kullanarak nasıl hareket etmeliyim: ${situation}`;
        
        return await this.generateContent(prompt, context);
    }
    
    async generateQuizQuestion(topic, difficulty = 'orta') {
        const context = `Sen bir çevik liderlik ve afet yönetimi eğitim uzmanısın. Okul müdürleri için test soruları hazırlıyorsun. 4 şıklı çoktan seçmeli sorular hazırla. Her seferinde farklı ve yaratıcı sorular üret. Türkçe yanıt ver.`;
        
        // Add randomness to make questions more varied
        const randomSeed = Math.floor(Math.random() * 1000);
        const timestamp = new Date().toLocaleTimeString();
        
        const prompt = `"${topic}" konusunda ${difficulty} seviyede bir test sorusu hazırla. 

Rastgelelik faktörü: ${randomSeed} (Bu sayıyı soru çeşitliliği için kullan)
Zaman: ${timestamp}

Konu detayları:
- Çevik liderlik prensipleri
- Afet ve kriz yönetimi
- Okul yönetimi ve liderlik
- Acil durum protokolleri
- Ekip yönetimi ve iletişim

Soru şu kriterleri karşılamalı:
- Pratik ve uygulamalı olsun
- Gerçek hayat senaryolarına dayansın
- 4 mantıklı seçenek olsun
- Açıklama eğitici olsun
- Her seferinde tamamen farklı bir soru üret (aynı soruları tekrarlama!)
- Farklı perspektiflerden yaklaş (yönetici, öğretmen, veli, öğrenci açısından)
- Çeşitli senaryolar kullan (deprem, yangın, sel, pandemi, vb.)

JSON formatında şu şekilde yanıtla:
{
    "question": "Soru metni",
    "options": ["A şıkkı", "B şıkkı", "C şıkkı", "D şıkkı"],
    "correct": 0,
    "explanation": "Doğru cevabın detaylı açıklaması",
    "scenario": "Hangi senaryo/durum",
    "perspective": "Hangi bakış açısı"
}`;
        
        return await this.generateContent(prompt, context);
    }
    
    async generateModuleSummary(moduleContent) {
        const context = `Sen bir eğitim içeriği uzmanısın. Çevik liderlik modüllerinin özetlerini hazırlıyorsun. Türkçe yanıt ver.`;
        const prompt = `Bu modül içeriğinin özetini hazırla: ${moduleContent}`;
        
        return await this.generateContent(prompt, context);
    }
    
    async generatePersonalizedFeedback(userProgress, completedModules) {
        const context = `Sen bir çevik liderlik koçusun. Öğrencilerin ilerlemesine göre kişiselleştirilmiş geri bildirimler veriyorsun. Türkçe yanıt ver.`;
        const prompt = `Kullanıcının genel ilerlemesi: %${userProgress}, tamamladığı modüller: ${completedModules.join(', ')}. Bu bilgilere göre kişiselleştirilmiş bir geri bildirim ve gelişim önerileri hazırla.`;
        
        return await this.generateContent(prompt, context);
    }
}

// Global Gemini API instance
window.GeminiAPI = new GeminiAPI();

console.log('✅ Gemini API entegrasyonu hazır!'); 