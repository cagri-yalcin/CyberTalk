# CyberTalk

### Güvenli İletişim Platformu

CyberTalk, React ve Firebase kullanılarak geliştirilen gerçek zamanlı
bir iletişim ve mesajlaşma platformudur.

Proje; kullanıcı kimlik doğrulama, kullanıcı profilleri, benzersiz
kullanıcı adları, birebir iletişim ve güvenli veri erişimi gibi
temel yapıların oluşturulması üzerine geliştirilmektedir.

---

## Proje Durumu

**Geliştirme aşamasındadır.**

CyberTalk şu anda temel uygulama altyapısının oluşturulması ve
ana kullanıcı deneyiminin geliştirilmesi aşamasındadır.

### Tamamlanan Temel Bileşenler

- CyberTalk arayüz ve marka yapısı
- Bağımsız Firebase altyapısı
- Google ile giriş
- E-posta ve şifre ile kayıt / giriş
- Şifre sıfırlama
- Kullanıcı profili
- Benzersiz kullanıcı adı sistemi
- Cloud Firestore bağlantısı
- Firestore güvenlik kuralları
- Temel kullanıcı ve konuşma veri yapısı

### Geliştirme Aşamasındaki Özellikler

- Birebir mesajlaşma
- Sohbet listesi
- Kullanıcı arama
- Gelişmiş profil ve hesap ayarları
- Yönetici yetkilendirmesi
- Yönetici paneli
- Mesaj moderasyonu
- Medya ve dosya paylaşımı
- Bildirim sistemi
- Sesli ve görüntülü görüşme

Bu özellikler geliştirme sürecinde aşamalı olarak sisteme
eklenecektir.

---

## Teknolojiler

- React
- JavaScript
- Firebase Authentication
- Cloud Firestore
- Firebase Cloud Functions
- CSS

---

## Proje Yapısı

```text
CyberTalk/
│
├── functions/
├── public/
├── src/
│   ├── components/
│   ├── services/
│   ├── styles/
│   ├── App.js
│   └── index.js
│
├── .gitignore
├── firebase.json
├── package.json
├── package-lock.json
├── ORIGIN.md
└── README.md
```

---

## Kimlik Doğrulama

CyberTalk kullanıcı hesaplarını Firebase Authentication
üzerinden yönetmektedir.

Desteklenen yöntemler:

- Google ile giriş
- E-posta ve şifre ile kayıt
- E-posta ve şifre ile giriş
- Şifre sıfırlama

Kayıt sonrasında kullanıcı için CyberTalk profili ve
benzersiz kullanıcı adı oluşturulmaktadır.

---

## Kullanıcı Profili

Kullanıcı profilleri Cloud Firestore üzerinde tutulmaktadır.

Temel profil yapısı:

```text
users/{uid}
├── uid
├── displayName
├── username
├── email
├── photoURL
├── role
├── createdAt
└── updatedAt
```

Kullanıcı adları ayrıca benzersizlik kontrolü amacıyla:

```text
usernames/{username}
```

yapısı üzerinden yönetilmektedir.

---

## Veri Yapısı

CyberTalk'un temel Firestore yapısı:

```text
users/{uid}
usernames/{username}
conversations/{conversationId}
messages/{messageId}
```

Bu yapı kullanıcı, konuşma ve mesaj verilerinin birbirinden
ayrıştırılarak yönetilmesini sağlar.

---

## Güvenlik

CyberTalk, Firebase Authentication ile kimlik doğrulama ve
Cloud Firestore Security Rules ile yetkilendirme yaklaşımını
birlikte kullanmaktadır.

Temel güvenlik yaklaşımı:

- Kimliği doğrulanmamış kullanıcıların kısıtlanması
- Kullanıcının kendi profilini yönetebilmesi
- Kullanıcı adı kayıtlarının korunması
- Konuşma katılımcılarının erişimlerinin sınırlandırılması
- Mesaj erişiminin konuşma katılımına göre kontrol edilmesi
- Yetkisiz veri yazma işlemlerinin engellenmesi

Güvenlik kuralları, yeni özellikler eklendikçe genişletilecektir.

---

## Yerel Çalıştırma

Gerekli paketleri yüklemek için:

```bash
npm install
```

Geliştirme sunucusunu başlatmak için:

```bash
npm start
```

Uygulama yerel geliştirme ortamında çalıştırılır.

---

## Proje Geçmişi

CyberTalk, başlangıç aşamasında
[React Firebase Chatroom](https://github.com/bartuserttas/react-firebase-chatroom)
projesindeki React ve Firebase tabanlı yapı temel alınarak geliştirilmiştir.

Sonraki aşamalarda proje bağımsız bir yapıya taşınmış; arayüz,
kimlik doğrulama, kullanıcı sistemi, Firestore veri modeli ve
güvenlik yapısı CyberTalk'a göre yeniden geliştirilmiştir.

Ayrıntılar için [ORIGIN.md](./ORIGIN.md) dosyasına bakabilirsiniz.

---

## Geliştirme Süreci

CyberTalk aktif olarak geliştirilmektedir.

Yeni özellikler eklendikçe kullanıcı deneyimi, güvenlik,
veri mimarisi ve uygulama altyapısı aşamalı olarak geliştirilecektir.

Git geçmişi, önemli geliştirme aşamalarını ayrı commitler
üzerinden takip edecek şekilde tutulmaktadır.