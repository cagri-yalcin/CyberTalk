import React, { useState } from 'react';
import { auth, db, firebase } from '../../services/firebase';

const USERNAME_PATTERN = /^[a-zA-Z0-9._]{3,20}$/;

function normalizeUsername(value) {
  return value.trim().toLowerCase();
}

function friendlyAuthError(error) {
  const map = {
    'auth/invalid-email': 'Geçerli bir e-posta adresi gir.',
    'auth/user-not-found': 'Bu e-posta ile kayıtlı bir hesap bulunamadı.',
    'auth/wrong-password': 'E-posta veya şifre hatalı.',
    'auth/email-already-in-use': 'Bu e-posta adresi zaten kullanılıyor.',
    'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
    'auth/popup-closed-by-user': 'Google giriş penceresi kapatıldı.',
    'auth/popup-blocked': 'Tarayıcı açılır pencereyi engelledi.',
    'auth/account-exists-with-different-credential': 'Bu e-posta başka bir giriş yöntemiyle kayıtlı.',
  };

  return map[error?.code] || error?.message || 'İşlem sırasında bir hata oluştu.';
}

async function createProfileAfterRegister(user, fullName, username) {
  const usernameRef = db.collection('usernames').doc(username);
  const profileRef = db.collection('users').doc(user.uid);

  try {
    await db.runTransaction(async (transaction) => {
      const usernameSnapshot = await transaction.get(usernameRef);

      if (usernameSnapshot.exists) {
        throw new Error('USERNAME_TAKEN');
      }

      transaction.set(usernameRef, {
        uid: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      transaction.set(profileRef, {
        uid: user.uid,
        displayName: fullName,
        username,
        email: user.email || '',
        photoURL: user.photoURL || '',
        role: 'user',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });

    await user.updateProfile({
      displayName: fullName,
    });
  } catch (error) {
    try {
      await user.delete();
    } catch (_) {}

    if (error.message === 'USERNAME_TAKEN') {
      throw new Error('Bu kullanıcı adı zaten kullanılıyor.');
    }

    throw error;
  }
}

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');

  const resetFields = () => {
    setMessage('');
    setPassword('');
    setPasswordAgain('');
  };

  const switchMode = (nextMode) => {
    resetFields();
    setMode(nextMode);
  };

  const signInGoogle = async () => {
    setLoading(true);
    setMessage('');

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await auth.signInWithPopup(provider);
      const user = result.user;

      const profileRef = db.collection('users').doc(user.uid);
      const snapshot = await profileRef.get();

      if (!snapshot.exists) {
        await profileRef.set({
          uid: user.uid,
          displayName: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || '',
          role: 'user',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    } catch (error) {
      setMessage(friendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const login = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await auth.signInWithEmailAndPassword(email.trim(), password);
    } catch (error) {
      setMessage(friendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  const register = async (event) => {
    event.preventDefault();
    setMessage('');

    const cleanName = fullName.trim();
    const cleanUsername = normalizeUsername(username);
    const cleanEmail = email.trim();

    if (cleanName.length < 2) {
      setMessage('Ad soyad en az 2 karakter olmalı.');
      return;
    }

    if (!USERNAME_PATTERN.test(cleanUsername)) {
      setMessage('Kullanıcı adı 3-20 karakter olmalı ve sadece harf, rakam, nokta veya alt çizgi içermeli.');
      return;
    }

    if (password.length < 6) {
      setMessage('Şifre en az 6 karakter olmalı.');
      return;
    }

    if (password !== passwordAgain) {
      setMessage('Şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);

    try {
      const credential = await auth.createUserWithEmailAndPassword(cleanEmail, password);
      await createProfileAfterRegister(credential.user, cleanName, cleanUsername);
    } catch (error) {
      setMessage(
        error.message === 'Bu kullanıcı adı zaten kullanılıyor.'
          ? error.message
          : friendlyAuthError(error)
      );
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setMessage('Önce e-posta adresini gir.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await auth.sendPasswordResetEmail(cleanEmail);
      setMessage('Şifre sıfırlama bağlantısı e-posta adresine gönderildi.');
    } catch (error) {
      setMessage(friendlyAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card auth-card-wide">
        <div className="brand-row">
          <div className="brand-mark">CT</div>
          <div>
            <div className="brand-name">CyberTalk</div>
            <div className="brand-subtitle">Güvenli iletişim platformu</div>
          </div>
        </div>

        <div className="auth-eyebrow">◈ CYBERTALK HESABI</div>

        {mode === 'login' && (
          <>
            <h1>Tekrar hoş geldin.</h1>
            <p className="auth-copy">Hesabına giriş yap ve konuşmaya devam et.</p>

            <form onSubmit={login} className="auth-form">
              <label>
                E-posta
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="ornek@mail.com"
                  required
                />
              </label>

              <label>
                Şifre
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                />
              </label>

              <button className="primary-btn" disabled={loading}>
                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </button>
            </form>

            <div className="divider"><span>veya</span></div>

            <button className="google-btn" onClick={signInGoogle} disabled={loading}>
              <span className="google-icon">G</span>
              Google ile devam et
            </button>

            <div className="auth-links">
              <button type="button" onClick={() => switchMode('forgot')}>
                Şifremi unuttum
              </button>
              <span>·</span>
              <button type="button" onClick={() => switchMode('register')}>
                Hesap oluştur
              </button>
            </div>
          </>
        )}

        {mode === 'register' && (
          <>
            <h1>CyberTalk'a katıl.</h1>
            <p className="auth-copy">Kendi profilini oluştur ve mesajlaşmaya başla.</p>

            <form onSubmit={register} className="auth-form">
              <label>
                Ad Soyad
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ad Soyad"
                  required
                />
              </label>

              <label>
                Kullanıcı Adı
                <div className="username-input">
                  <span>@</span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                    placeholder="kullaniciadi"
                    maxLength={20}
                    required
                  />
                </div>
              </label>

              <label>
                E-posta
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="ornek@mail.com"
                  required
                />
              </label>

              <label>
                Şifre
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="En az 6 karakter"
                  required
                />
              </label>

              <label>
                Şifre Tekrar
                <input
                  value={passwordAgain}
                  onChange={(e) => setPasswordAgain(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Şifreni tekrar yaz"
                  required
                />
              </label>

              <button className="primary-btn" disabled={loading}>
                {loading ? 'Hesap oluşturuluyor...' : 'Hesap Oluştur'}
              </button>
            </form>

            <div className="auth-links centered">
              <span>Zaten hesabın var mı?</span>
              <button type="button" onClick={() => switchMode('login')}>
                Giriş yap
              </button>
            </div>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <h1>Şifreni yenile.</h1>
            <p className="auth-copy">
              E-posta adresini gir. Sana şifre sıfırlama bağlantısı gönderelim.
            </p>

            <form onSubmit={resetPassword} className="auth-form">
              <label>
                E-posta
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="ornek@mail.com"
                  required
                />
              </label>

              <button className="primary-btn" disabled={loading}>
                {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
              </button>
            </form>

            <div className="auth-links centered">
              <button type="button" onClick={() => switchMode('login')}>
                Giriş ekranına dön
              </button>
            </div>
          </>
        )}

        {message && <div className="auth-message">{message}</div>}

        <div className="auth-foot">CyberTalk · Güvenli iletişim platformu</div>
      </section>
    </main>
  );
}
