//var converter = new showdown.Converter();

const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const API_URL = '/api/chat';
const MODEL_NAME = 'deepseek-r1:14b';

const md = markdownit()

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
        recordBtn.textContent = '🛑';
    } else {
        mediaRecorder.stop();
        mediaRecorder = null;
        recordBtn.textContent = '🎙️';
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

userInput.addEventListener('keypress', (e) => {
    if ((e.shiftKey && e.key === 'Enter')) {
        // Prevent the default action of Shift+Enter
    } else if (e.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
});

document.addEventListener('DOMContentLoaded',()=>{
   userInput.focus();
});
