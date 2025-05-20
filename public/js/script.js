//var converter = new showdown.Converter();

const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const API_URL = '/api/chat';
const MODEL_NAME = 'llama3';

const md = markdownit()


let chatId = 1; // Use the chat ID created or selected

let mediaRecorder;

let audioChunks = [];
const recordBtn = document.getElementById('record');
const transcriptEl = document.getElementById('transcript');
const responseEl = document.getElementById('response');

recordBtn.addEventListener('click', async () => {
    if (!mediaRecorder) {
        audioChunks = [];
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = sendAudio;
        mediaRecorder.start();
        recordBtn.innerHTML = `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M18.32 6.53C17.66 3.93 15.31 2 12.5 2C9.19 2 6.5 4.69 6.5 8V13C6.5 14.46 7.02 15.8 7.89 16.84" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M18.5 9.97998V13C18.5 16.31 15.81 19 12.5 19C11.77 19 11.06 18.87 10.42 18.63" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6.35999 19.58C7.96999 21.08 10.13 22 12.5 22C17.47 22 21.5 17.97 21.5 13V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M22 2.98999L3 21.99" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12.05 5.50001V2.26001" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9 3.5V7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
    } else {
        mediaRecorder.stop();
        mediaRecorder = null;
        recordBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12.5 19C15.81 19 18.5 16.31 18.5 13V8C18.5 4.69 15.81 2 12.5 2C9.19 2 6.5 4.69 6.5 8V13C6.5 16.31 9.19 19 12.5 19Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M3.5 11V13C3.5 17.97 7.53 22 12.5 22C17.47 22 21.5 17.97 21.5 13V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M9.60999 7.47993C11.39 6.82993 13.33 6.82993 15.11 7.47993" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M10.53 10.4799C11.73 10.1499 13 10.1499 14.2 10.4799" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/> 
                            </svg>️`;
    }
});

async function sendAudio() {
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');

    const res = await fetch('/transcribe', {
        method: 'POST',
        body: formData
    });

    const { text } = await res.json();
    // transcriptEl.textContent = `🧾 You said: ${text}`;
    userInput.value = text;
    sendMessage();
}



async function sendMessage() {
    const content = userInput.value.trim();
    if (!content) return;

    // Display user message
    createMessage('user')
    addMessage(content, 'user');
    saveMessage(content, 'user');
    userInput.value = '';

    const messages = document.querySelectorAll('.message');

    // Initialize an array to hold user messages
    let Messages = [];

    // Loop through each element and extract its text content
    messages.forEach(message => {
        const role = message.classList.contains('user') ? 'user' : 'assistant';
        Messages.push({ role: role, content: message.textContent });
    });

    console.log(Messages);

    // Send message to Ollama API with streaming enabled
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: Messages,
                stream: true  // Enable streaming
            })
        });
        if (response.ok) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let messageContent = '';  // Accumulate the assistant's response

            createMessage('assistant');
            while (!done) {
                const { value, done: chunkDone } = await reader.read();
                done = chunkDone;
                if(done)
                {
                  // console.log(messageContent);
                    const result = md.render(messageContent);
                    // const htmlContent = marked.parse(messageContent);  // Convert Markdown to HTML
                    addMessage(result, 'assistant', true);  // Pass `true` to indicate HTML content
                    saveMessage(result,'assistant');
                    wrapThinkBlocks(messagesContainer.lastElementChild);
                  break;
                }
                const chunkText = decoder.decode(value, { stream: true });
                try {
                    const parsedChunk = JSON.parse(chunkText);  // Parse the chunk into JSON
                    const assistantMessage = parsedChunk.message?.content || '';
                    messageContent += assistantMessage;  // Append the message content
                } catch (e) {
                    console.error('Error parsing chunk:', e);
                }

                const result = md.render(messageContent);
                addMessage(result, 'assistant', true);  // Pass `true` to indicate HTML content
                // const htmlContent = marked.parse(messageContent);  // Convert Markdown to HTML
                // addMessage(htmlContent, 'assistant', true);  // Pass `true` to indicate HTML content
            }
        } else {
            addMessage('Failed to get response from Ollama API.', 'assistant');
        }
    } catch (error) {
        addMessage(`Error: ${error.message}`, 'assistant');
    }
}

function createMessage(sender)
{
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}`;
  messagesContainer.appendChild(messageDiv);
}

// function wrapThinkBlocks(container) {
//     const allElements = Array.from(container.childNodes);
//     let startIndex = null;
//     let endIndex = null;
//
//     // Find the start and end of the think block
//     for (let i = 0; i < allElements.length; i++) {
//         const node = allElements[i];
//         if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
//             const text = node.textContent || '';
//
//             if (text.includes('<think>') && startIndex === null) {
//                 startIndex = i;
//             }
//
//             if (text.includes('</think>') && startIndex !== null) {
//                 endIndex = i;
//                 break;
//             }
//         }
//     }
//
//     if (startIndex !== null && endIndex !== null) {
//         const wrapper = document.createElement('div');
//         wrapper.classList.add('think');
//
//         const toWrap = allElements.slice(startIndex, endIndex + 1);
//
//         for (let node of toWrap) {
//             const clone = node.cloneNode(true);
//
//             // Clean <think> and </think> tags from text content
//             if (clone.nodeType === Node.ELEMENT_NODE || clone.nodeType === Node.TEXT_NODE) {
//                 clone.textContent = (clone.textContent || '')
//                     .replace('<think>', '')
//                     .replace('</think>', '');
//             }
//
//             wrapper.appendChild(clone);
//             container.removeChild(node);
//         }
//
//         // Insert wrapper at startIndex location
//         const referenceNode = container.childNodes[startIndex];
//         if (referenceNode) {
//             container.insertBefore(wrapper, referenceNode);
//         } else {
//             container.appendChild(wrapper);
//         }
//     }
// }

function wrapThinkBlocks(container) {
    const allElements = Array.from(container.childNodes);
    let startIndex = null;
    let endIndex = null;

    for (let i = 0; i < allElements.length; i++) {
        const node = allElements[i];
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';

            if (text.includes('<think>') && startIndex === null) {
                startIndex = i;
            }

            if (text.includes('</think>') && startIndex !== null) {
                endIndex = i;
                break;
            }
        }
    }

    if (startIndex !== null && endIndex !== null) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('think', 'collapsed');

        // Add toggle button
        const button = document.createElement('button');
        button.classList.add('toggle-btn');
        button.textContent = '💭 Show Thought';

        button.addEventListener('click', () => {
            wrapper.classList.toggle('collapsed');
            button.textContent = wrapper.classList.contains('collapsed')
                ? '💭 Show Thought'
                : '💭 Hide Thought';
        });

        const content = document.createElement('div');
        content.classList.add('think-content');

        const toWrap = allElements.slice(startIndex, endIndex + 1);
        for (let node of toWrap) {
            const clone = node.cloneNode(true);
            if (clone.nodeType === Node.ELEMENT_NODE || clone.nodeType === Node.TEXT_NODE) {
                clone.textContent = (clone.textContent || '')
                    .replace('<think>', '')
                    .replace('</think>', '');
            }
            content.appendChild(clone);
            container.removeChild(node);
        }

        wrapper.appendChild(button);
        wrapper.appendChild(content);

        const referenceNode = container.childNodes[startIndex];
        if (referenceNode) {
            container.insertBefore(wrapper, referenceNode);
        } else {
            container.appendChild(wrapper);
        }
    }
}

function addMessage(content, sender, isHtml = false) {

    const messageDiv = messagesContainer.lastElementChild;
    // If the content is HTML (Markdown converted), insert as HTML
    if (isHtml) {
        messageDiv.innerHTML = content;  // Inject the HTML content
    } else {
        messageDiv.textContent = content;  // Regular text content
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;  // Auto-scroll
}

function renderMessage(sender, content) {
    const div = document.createElement('div');
    div.className = sender; // 'user' or 'assistant'
    div.className += ' message';
    div.innerHTML = content;
    wrapThinkBlocks(div);
    messagesContainer.appendChild(div);
}

function loadMessages(id) {
    fetch(`/chats/${id}/messages`)
        .then(res => res.json())
        .then(messages => {
            chatId = id;
            messagesContainer.innerHTML = '';
            messages.forEach(m => {
                renderMessage(m.sender, m.content);
            });
        });
    togglePanel();
}

function saveMessage(content, sender) {
    fetch(`/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: sender, content })
    }).then(() => {
        // document.getElementById('msgInput').value = '';
        // loadMessages();
    });
}


loadMessages();

userInput.addEventListener('keypress', (e) => {
    if ((e.shiftKey && e.key === 'Enter')) {
        // Prevent the default action of Shift+Enter
    } else if (e.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
});

// const newChatBtn = document.getElementById('newChat');
// if (newChatBtn) {
//     newChatBtn.addEventListener('click', (e) => {
//         chatId++;
//         fetch(`/chats`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ name: `chat_${chatId}` }),
//         }).then(response => console.log(response.json()))
//             .catch(error => {
//                 // Handle the error here
//                 console.error('Error:', error);
//                 if (error.response) {
//                     // The request was made and the server responded with this status code
//                     const err = error.response.data;
//                     console.error('Server Error:', err);
//                 } else {
//                     // Something happened in setting up the request that triggered an error.
//                     console.error('Error:', error.message);
//                 }
//             })
//             .finally(() => {
//                 // Do something after the promise is settled (regardless of success or failure)
//                 loadMessages();
//             });
//     })
// }

document.addEventListener('DOMContentLoaded',()=>{
   userInput.focus();
});
