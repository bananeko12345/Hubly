import './styles.css';
import {
  addDoc,
  auth,
  collection,
  db,
  firebaseConfigured,
  googleProvider,
  onAuthStateChanged,
  onSnapshot,
  serverTimestamp,
  signInWithPopup,
  signOut
} from './firebase.js';

const channels = [
  { id: 'general', name: 'general', label: '雑談', icon: '#', group: 'TEXT CHANNELS', description: '今日のこと、最近ハマってること、なんでもどうぞ。' },
  { id: 'random', name: 'random', label: 'なんでも', icon: '#', group: 'TEXT CHANNELS', description: 'ここだけの話。脱線、大歓迎。' },
  { id: 'design', name: 'design-lab', label: 'デザイン部', icon: '#', group: 'TEXT CHANNELS', description: '色・文字・余白について語る実験室。' },
  { id: 'voice', name: '作業部屋', label: '作業部屋', icon: '◖', group: 'VOICE CHANNELS', description: '静かに一緒に作業する場所。' },
  { id: 'secret', name: 'secret-menu', label: 'ひみつ', icon: '✦', group: 'TEXT CHANNELS', description: '見つけた人だけの小さな隠し部屋。' }
];

const members = [
  { name: 'mika', note: '新しいUIを考え中', initials: 'MI', color: '#ef8fa9', status: 'online' },
  { name: 'sora', note: '音楽を聴いています', initials: 'SO', color: '#7b9ff2', status: 'online' },
  { name: 'ren', note: 'ちょっと離席中', initials: 'RE', color: '#e1a85c', status: 'idle' },
  { name: 'yui', note: '読書中', initials: 'YU', color: '#72c9b5', status: 'online' },
  { name: 'toma', note: 'オフライン', initials: 'TO', color: '#a68bd4', status: 'offline' }
];

const seedMessages = {
  general: [
    { user: 'mika', time: '09:41', text: 'おはよう！今日もゆるくやっていこう ☕', color: '#ef8fa9', initials: 'MI' },
    { user: 'sora', time: '09:46', text: 'おはよう。朝のコーヒー、3杯目に入りました。', color: '#7b9ff2', initials: 'SO' },
    { user: 'ren', time: '10:02', text: 'それはもうコーヒーではなく、やる気のポーション。', color: '#e1a85c', initials: 'RE' },
    { user: 'yui', time: '10:18', text: '今日の小さな目標：画面をひとつ完成させる！', color: '#72c9b5', initials: 'YU' }
  ],
  random: [
    { user: 'sora', time: '昨日 18:21', text: '最近、帰り道に同じ猫と目が合う。たぶん友達。', color: '#7b9ff2', initials: 'SO' },
    { user: 'mika', time: '昨日 18:29', text: '猫側も「また来た」って思ってるかもしれない。', color: '#ef8fa9', initials: 'MI' },
    { user: 'toma', time: '昨日 19:05', text: '次に会ったら名刺を渡してみてほしい。', color: '#a68bd4', initials: 'TO' }
  ],
  design: [
    { user: 'yui', time: '11:08', text: '余白は何もない場所じゃなくて、呼吸する場所。', color: '#72c9b5', initials: 'YU' },
    { user: 'mika', time: '11:13', text: 'その言い方すき。カードの間をあと8px広げようかな。', color: '#ef8fa9', initials: 'MI' },
    { user: 'ren', time: '11:20', text: '8pxはだいたい正義。', color: '#e1a85c', initials: 'RE' }
  ],
  voice: [
    { user: 'sora', time: '10:30', text: 'ここは静かな作業部屋です。文字でそっと応援しよう。', color: '#7b9ff2', initials: 'SO' },
    { user: 'yui', time: '10:41', text: '集中モード開始。終わったら拍手ください。', color: '#72c9b5', initials: 'YU' }
  ],
  secret: [
    { user: 'ren', time: '???', text: 'ここまで来たあなたへ。今日のラッキーカラーは #8B7BFF。', color: '#e1a85c', initials: 'RE' }
  ]
};

const state = {
  activeChannel: localStorage.getItem('chatdock-channel') || 'general',
  theme: localStorage.getItem('chatdock-theme') || 'dark',
  query: '',
  messages: JSON.parse(localStorage.getItem('chatdock-messages') || 'null') || structuredClone(seedMessages),
  user: null
};

document.documentElement.dataset.theme = state.theme;

const app = document.querySelector('#app');
let cloudUnsubscribe = null;

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function activeChannel() { return channels.find((channel) => channel.id === state.activeChannel) || channels[0]; }

function avatar(initials, color, className = 'message-avatar') {
  return `<span class="${className}" style="background:${color}">${escapeHtml(initials)}</span>`;
}

function userInitials(user) {
  return (user?.displayName || user?.email || 'YO').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function userColor(user) {
  return user?.photoURL ? `url(${user.photoURL})` : '#b0a5ff';
}

function userCard() {
  if (state.user) {
    const initials = userInitials(state.user);
    return `${avatar(initials, userColor(state.user), 'user-avatar')}<div class="user-meta"><strong>${escapeHtml(state.user.displayName || state.user.email || 'Google user')}</strong><span>Googleでログイン中</span></div><button class="icon-button" id="logout-button" aria-label="ログアウト">↪</button>`;
  }
  const message = firebaseConfigured ? 'Googleでログイン' : 'Firebase未設定 · デモモード';
  return `${avatar('YO', '#b0a5ff', 'user-avatar')}<div class="user-meta"><strong>guest</strong><span>${message}</span></div><button class="icon-button" id="login-button" aria-label="Googleでログイン">↗</button>`;
}

function renderShell() {
  const channel = activeChannel();
  const groups = ['TEXT CHANNELS', 'VOICE CHANNELS'];
  app.innerHTML = `
    <div class="app-shell">
      <nav class="server-rail" aria-label="サーバー一覧">
        <button class="server-logo" aria-label="Hubly Chatホーム">✦</button>
        <div class="rail-divider"></div>
        <button class="server-icon active" aria-label="Hubly Chatサーバー">HC</button>
        <button class="server-icon" aria-label="デザインサーバー">◒</button>
        <button class="server-icon" aria-label="音楽サーバー">♫</button>
        <button class="server-icon server-add" aria-label="サーバーを追加">+</button>
        <div class="rail-spacer"></div>
        <button class="server-icon" aria-label="ヘルプ">?</button>
        <div class="user-mini" aria-label="自分のステータス">YO</div>
      </nav>

      <aside class="channel-sidebar" aria-label="チャンネル一覧">
        <header class="server-heading">
          <div><h2>Hubly Chat</h2><small>小さな会話の寄り道</small></div>
          <button class="icon-button" aria-label="サーバーメニュー">⌄</button>
        </header>
        <div class="channel-scroll">
          ${groups.map((group) => `
            <section class="channel-group">
              <div class="channel-group-title"><span>${group}</span><span>＋</span></div>
              ${channels.filter((item) => item.group === group).map((item) => `
                <button class="channel-row ${item.id === state.activeChannel ? 'active' : ''}" data-channel="${item.id}">
                  <span class="channel-symbol">${item.icon}</span><span class="channel-name">${item.name}</span>${item.id !== state.activeChannel ? '<span class="channel-unread"></span>' : ''}
                </button>`).join('')}
            </section>`).join('')}
        </div>
        <div class="user-card">${userCard()}<button class="icon-button" id="mute-button" aria-label="ミュート">♬</button><button class="icon-button" id="settings-button" aria-label="設定">⚙</button></div>
      </aside>

      <main class="chat-main">
        <header class="chat-header">
          <span class="channel-heading-icon">${channel.icon}</span>
          <div class="chat-heading"><h1>${channel.name}</h1><p>${channel.description}</p></div>
          <div class="header-actions">
            <label class="search-box" aria-label="メッセージを検索"><span>⌕</span><input id="search-input" type="search" placeholder="検索" value="${escapeHtml(state.query)}" /></label>
            <button class="icon-button" id="theme-button" aria-label="テーマを切り替え">${state.theme === 'dark' ? '☼' : '☾'}</button>
            <button class="icon-button" aria-label="通知">♢</button>
            <button class="icon-button" aria-label="メンバーを表示">☷</button>
          </div>
        </header>
        <section class="message-area" id="message-area" aria-live="polite">
          <div class="welcome-card"><div class="welcome-kicker">YOU FOUND A CORNER OF THE INTERNET</div><h2>#${channel.name} へようこそ。</h2><p>${channel.description} ここから先は、会話の流れをつくるのはあなたです。</p></div>
          <div class="message-list" id="message-list"></div>
        </section>
        <div class="composer-wrap">
          <form class="composer" id="composer-form"><button type="button" class="icon-button" aria-label="添付">＋</button><input id="message-input" autocomplete="off" placeholder="#${channel.name} にメッセージを送る" /><div class="composer-actions"><button type="button" class="icon-button" aria-label="GIFを追加">GIF</button><button type="button" class="icon-button" aria-label="絵文字を追加">☺</button><button type="submit" class="send-button" aria-label="送信">↑</button></div></form>
          <p class="composer-hint">Enterで送信 · Shift + Enterで改行 · このデモの会話はブラウザに保存されます</p>
        </div>
      </main>

      <aside class="members-panel" aria-label="オンラインメンバー">
        <div class="members-heading"><h2>メンバー</h2><span>${members.length + 1}</span></div>
        <section class="member-section"><h3 class="member-section-title">オンライン — ${members.filter((m) => m.status === 'online').length + 1}</h3><div class="member-row"><div class="member-avatar-wrap">${avatar('YO', '#b0a5ff', 'member-avatar')}<i class="status-dot"></i></div><div><div class="member-name">you</div><div class="member-note">この場所にいます</div></div></div>${members.filter((m) => m.status === 'online').map(memberTemplate).join('')}</section>
        <section class="member-section"><h3 class="member-section-title">離席中 — 1</h3>${members.filter((m) => m.status === 'idle').map(memberTemplate).join('')}</section>
        <section class="member-section"><h3 class="member-section-title">オフライン — 1</h3>${members.filter((m) => m.status === 'offline').map(memberTemplate).join('')}</section>
      </aside>
    </div>`;
  renderMessages();
  bindEvents();
}

function memberTemplate(member) {
  return `<div class="member-row"><div class="member-avatar-wrap">${avatar(member.initials, member.color, 'member-avatar')}<i class="status-dot ${member.status}"></i></div><div><div class="member-name">${member.name}</div><div class="member-note">${member.note}</div></div></div>`;
}

function renderMessages() {
  const list = document.querySelector('#message-list');
  if (!list) return;
  const query = state.query.trim().toLowerCase();
  const messages = (state.messages[state.activeChannel] || []).filter((message) => !query || `${message.user} ${message.text}`.toLowerCase().includes(query));
  if (!messages.length) {
    list.innerHTML = `<div class="empty-state"><div><strong>${query ? '見つかる会話がありません' : 'まだメッセージがありません'}</strong><span>${query ? '別のキーワードでもう一度試してみてください。' : '最初のひとことを送ってみよう。'}</span></div></div>`;
    return;
  }
  list.innerHTML = messages.map((message) => {
    const text = escapeHtml(message.text);
    const highlighted = query ? text.replace(new RegExp(`(${escapeRegex(escapeHtml(query))})`, 'ig'), '<mark>$1</mark>') : text;
    return `<article class="message">${avatar(message.initials, message.color)}<div class="message-body"><div class="message-meta"><strong>${escapeHtml(message.user)}</strong><time>${escapeHtml(message.time)}</time></div><p>${highlighted}</p></div></article>`;
  }).join('');
}

function bindEvents() {
  document.querySelectorAll('[data-channel]').forEach((button) => button.addEventListener('click', () => {
    state.activeChannel = button.dataset.channel;
    state.query = '';
    localStorage.setItem('chatdock-channel', state.activeChannel);
    renderShell();
  }));

  document.querySelector('#theme-button')?.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = state.theme;
    localStorage.setItem('chatdock-theme', state.theme);
    renderShell();
  });

  document.querySelector('#search-input')?.addEventListener('input', (event) => {
    state.query = event.target.value;
    renderMessages();
  });

  document.querySelector('#composer-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.querySelector('#message-input');
    const text = input.value.trim();
    if (!text) return;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const message = { user: state.user?.displayName || 'you', time, text, color: '#b0a5ff', initials: userInitials(state.user) };
    if (state.user && db) {
      addDoc(collection(db, 'messages'), { channelId: state.activeChannel, text, user: message.user, initials: message.initials, uid: state.user.uid, createdAt: serverTimestamp() }).then(() => showToast('Firestoreに保存しました')).catch(() => showToast('保存できませんでした。Firebase設定を確認してください'));
    } else {
      state.messages[state.activeChannel] ??= [];
      state.messages[state.activeChannel].push(message);
      localStorage.setItem('chatdock-messages', JSON.stringify(state.messages));
      renderMessages();
      showToast('このブラウザに保存しました');
    }
    input.value = '';
    const area = document.querySelector('#message-area');
    area?.scrollTo({ top: area.scrollHeight, behavior: 'smooth' });
    showToast('メッセージを送信しました');
  });

  document.querySelector('#login-button')?.addEventListener('click', () => {
    if (!firebaseConfigured || !auth || !googleProvider) return showToast('Firebase設定を .env に追加してください');
    signInWithPopup(auth, googleProvider).catch(() => showToast('Googleログインをキャンセルしました'));
  });
  document.querySelector('#logout-button')?.addEventListener('click', () => signOut(auth));
  document.querySelector('#settings-button')?.addEventListener('click', () => showToast('設定は次のアップデートで登場します'));
  document.querySelector('#mute-button')?.addEventListener('click', (event) => { event.currentTarget.textContent = event.currentTarget.textContent === '♬' ? '♩' : '♬'; showToast(event.currentTarget.textContent === '♩' ? '通知音をミュートしました' : '通知音をオンにしました'); });
}

let toastTimer;
function showToast(message) {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.append(toast);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.remove(), 2400);
}

if (auth) {
  onAuthStateChanged(auth, (user) => {
    state.user = user;
    cloudUnsubscribe?.();
    cloudUnsubscribe = null;
    if (user && db) {
      cloudUnsubscribe = onSnapshot(collection(db, 'messages'), (snapshot) => {
        const cloudMessages = structuredClone(seedMessages);
        snapshot.forEach((messageDoc) => {
          const data = messageDoc.data();
          if (!data.channelId || !data.text) return;
          const created = data.createdAt?.toDate?.();
          cloudMessages[data.channelId] ??= [];
          cloudMessages[data.channelId].push({ user: data.user || 'Google user', time: created ? created.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : 'now', text: data.text, color: data.uid === user.uid ? '#b0a5ff' : '#7b9ff2', initials: data.initials || 'GU' });
        });
        state.messages = cloudMessages;
        renderMessages();
      });
    }
    renderShell();
  });
} else {
  renderShell();
}
