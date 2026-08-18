export function getConversationId(uidA, uidB) {
  return [uidA, uidB].sort().join('_');
}

export function formatMessageTime(timestamp) {
  if (!timestamp || !timestamp.toDate) return '';
  return timestamp.toDate().toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
