const panel = document.getElementById('sidePanel');
const toggleBtn = document.getElementById('togglePanel');
const chatList = document.getElementById('chatList');
const newChatBtn = document.getElementById('newChatBtn');


toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('hidden');
});

newChatBtn.addEventListener('click', () => {
    const chatName = prompt("Enter a name for the new chat:");
    if (chatName) {
        fetch(`/chats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: chatName })
        })
            .then(res => res.json())
            .then(() => loadChats());
    }
});

function loadChats() {
    fetch(`/chats/all`) // assuming you’ll expose this endpoint
        .then(res => res.json())
        .then(chats => {
            chatList.innerHTML = '';
            chats.forEach(chat => {
                const btn = document.createElement('button');
                btn.className = 'chat-item';
                btn.textContent = chat.name;
                btn.dataset.id = chat.id;
                btn.addEventListener('click', () => {
                    loadMessages(chat.id); // define this in your main app
                });
                chatList.appendChild(btn);
            });
        });
}

// Call it on page load
loadChats();
