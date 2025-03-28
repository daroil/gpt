//var converter = new showdown.Converter();

const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const API_URL = 'http://localhost:11434/api/chat';
const MODEL_NAME = 'qwen2.5-coder';

const md = markdownit()

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
