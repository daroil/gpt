const panel = document.getElementById('sidePanel');
const toggleBtn = document.getElementById('togglePanel');
const toggleBtnEmbed = document.getElementById('togglePanelEmbed');
const chatList = document.getElementById('chatList');
const newChatBtn = document.getElementById('newChatBtn');
const sidePanelContent = document.getElementById('sidePanelContent');


toggleBtn.addEventListener('click', togglePanel);
toggleBtnEmbed.addEventListener('click', togglePanel);

function togglePanel() {
    if(panel)
    {
        if (!panel.classList.contains('hidden')) {
            setTimeout(()=>{
                panel.classList.add('invisible');
                toggleBtn.classList.remove('invisible');
            },402)
            panel.classList.add('hidden');
        }
        else{
            panel.classList.remove('invisible');
            setTimeout(()=>{
                // panel.classList.toggle('invisible');
                panel.classList.remove('hidden');
            },402)
            toggleBtn.classList.add('invisible');
        }
    }
}

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
                btn.className = 'chat-item side-button';
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
