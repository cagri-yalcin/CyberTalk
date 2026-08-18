import React from 'react';
import { auth, firebase } from '../../services/firebase';

export default function SignIn() {
  const signIn = async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await auth.signInWithPopup(provider);
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-row">
          <div className="brand-mark">CT</div>
          <div>
            <div className="brand-name">CyberTalk</div>
            <div className="brand-subtitle">Güvenli iletişim platformu</div>
          </div>
        </div>

        <div className="eyebrow">◈ GİZLİLİK TASARIMIN TEMELİNDE</div>
        <h1>Önem verdiğin insanlarla konuş.</h1>
        <p className="auth-copy">
          Gerçek zamanlı ve güvenli iletişim için geliştirilen CyberTalk.
        </p>

        <button className="google-btn" onClick={signIn}>
          <span className="google-icon">G</span>
          Google ile devam et
        </button>

        <div className="auth-foot">CyberTalk MVP · Secure Communication Platform</div>
      </section>
    </main>
  );
}
