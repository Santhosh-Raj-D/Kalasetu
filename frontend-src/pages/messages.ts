import { initLayout } from '../lib/layout';
import { requireUser, getUser, CurrentUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { showToast } from '../lib/toast';

interface Conversation {
  id: number;
  other_user_id: number;
  other_user_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

interface Message {
  id: number;
  sender_id: number;
  sender_name: string;
  body: string;
  created_at: string;
}

let currentConvoId: number | null = null;
let currentUser: CurrentUser | null = null;
let lastMessageId = 0;
let pollTimer: ReturnType<typeof setInterval> | null = null;

async function init() {
  await initLayout();
  currentUser = await requireUser('CUSTOMER', 'ARTISAN');
  await loadConversations();

  // Check URL for ?convo= param
  const params = new URLSearchParams(window.location.search);
  const convoId = params.get('convo');
  if (convoId) openConversation(parseInt(convoId));
}

async function loadConversations() {
  const listBody = document.getElementById('convo-list-body')!;
  const res = await apiFetch<{ conversations: Conversation[] }>('/api/messages/conversations');
  if (!res.success || !res.data) {
    listBody.innerHTML = '<div style="padding:1rem;color:var(--mud);font-size:0.85rem">Failed to load conversations</div>';
    return;
  }
  const { conversations } = res.data;
  if (!conversations.length) {
    listBody.innerHTML = '<div style="padding:1rem;color:var(--mud);font-size:0.85rem">No conversations yet</div>';
    return;
  }
  listBody.innerHTML = conversations.map(c => `
    <div class="convo-item ${c.unread_count > 0 ? 'unread' : ''}" data-id="${c.id}" data-name="${c.other_user_name}">
      <p class="convo-name">${c.other_user_name}</p>
      <p class="convo-preview">${c.last_message || '—'}</p>
      <p class="convo-time">${c.last_message_at ? formatDateTime(c.last_message_at) : ''}</p>
    </div>`).join('');

  document.querySelectorAll('.convo-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt((item as HTMLElement).dataset.id!);
      openConversation(id);
    });
  });
}

async function openConversation(convoId: number) {
  if (pollTimer) clearInterval(pollTimer);
  currentConvoId = convoId;
  lastMessageId = 0;

  document.querySelectorAll('.convo-item').forEach(el => el.classList.remove('active'));
  const activeConvo = document.querySelector(`.convo-item[data-id="${convoId}"]`);
  if (activeConvo) {
    activeConvo.classList.add('active');
    activeConvo.classList.remove('unread');
    document.getElementById('thread-title')!.textContent = (activeConvo as HTMLElement).dataset.name || 'Conversation';
  }

  document.getElementById('thread-compose')!.style.display = 'flex';
  await loadMessages(convoId, true);

  pollTimer = setInterval(() => pollMessages(convoId), 5000);
  setupCompose(convoId);
}

async function loadMessages(convoId: number, scroll: boolean) {
  const container = document.getElementById('thread-messages')!;
  const res = await apiFetch<{ messages: Message[] }>(`/api/messages/${convoId}`);
  if (!res.success || !res.data) return;
  const messages = res.data.messages;
  if (!messages.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--mud);font-size:0.85rem;margin-top:2rem">No messages yet. Say hello!</div>';
    return;
  }
  lastMessageId = Math.max(...messages.map(m => m.id));
  container.innerHTML = messages.map(m => renderBubble(m)).join('');
  if (scroll) container.scrollTop = container.scrollHeight;
}

async function pollMessages(convoId: number) {
  if (currentConvoId !== convoId) return;
  const res = await apiFetch<{ messages: Message[] }>(`/api/messages/${convoId}?after=${lastMessageId}`);
  if (!res.success || !res.data || !res.data.messages.length) return;
  const container = document.getElementById('thread-messages')!;
  const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 40;
  res.data.messages.forEach(m => {
    lastMessageId = Math.max(lastMessageId, m.id);
    container.insertAdjacentHTML('beforeend', renderBubble(m));
  });
  if (wasAtBottom) container.scrollTop = container.scrollHeight;
}

function renderBubble(m: Message): string {
  const mine = currentUser && m.sender_id === currentUser.id;
  return `
    <div class="msg-bubble ${mine ? 'mine' : 'theirs'}">
      <div class="msg-body">${escapeHtml(m.body)}</div>
      <p class="msg-meta">${mine ? '' : m.sender_name + ' · '}${formatDateTime(m.created_at)}</p>
    </div>`;
}

function setupCompose(convoId: number) {
  const input = document.getElementById('compose-input') as HTMLTextAreaElement;
  const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;

  // Remove old listeners by cloning
  const newSend = sendBtn.cloneNode(true) as HTMLButtonElement;
  sendBtn.parentNode!.replaceChild(newSend, sendBtn);
  const newInput = input.cloneNode(true) as HTMLTextAreaElement;
  input.parentNode!.replaceChild(newInput, input);

  async function send() {
    const body = newInput.value.trim();
    if (!body) return;
    newSend.disabled = true;
    const res = await apiFetch(`/api/messages/${convoId}`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
    newSend.disabled = false;
    if (res.success) {
      newInput.value = '';
      await pollMessages(convoId);
      const container = document.getElementById('thread-messages')!;
      container.scrollTop = container.scrollHeight;
    } else {
      showToast(res.error || 'Send failed', 'error');
    }
  }

  newSend.addEventListener('click', send);
  newInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

init();
